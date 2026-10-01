import { OtpService } from '../../domain/otp/service/otp.service';
import { IOtpRepositoryRead } from '../../domain/otp/repository/otp.repository.read';
import { IOtpRepositoryWrite } from '../../domain/otp/repository/otp.repository.write';
import { IOtpCodeGenerator } from '../../domain/otp/interfaces/otp-code.generator.interface';
import { ISmsProvider } from '../../domain/otp/interfaces/sms.provider.interface';
import { IOtp } from '../../domain/otp/interfaces/otp.interface';
import { BusinessRuleError } from '../../domain/errors/business-rule.error';
import { TooManyRequestsError } from '../../domain/errors/too-many-requests.error';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error';
import { FixedClock } from '../helpers/fixed.clock';

const PHONE = '+5511999998888';
const CODE = '123456';

let clock: FixedClock;
let otpRepositoryRead: jest.Mocked<IOtpRepositoryRead>;
let otpRepositoryWrite: jest.Mocked<IOtpRepositoryWrite>;
let smsProvider: jest.Mocked<ISmsProvider>;
let otpCodeGenerator: jest.Mocked<IOtpCodeGenerator>;

function createService(exposeCode = false) {
  return new OtpService({
    otpRepositoryRead,
    otpRepositoryWrite,
    smsProvider,
    otpCodeGenerator,
    clock,
    exposeCode,
  });
}

function anOtp(overrides: Partial<IOtp> = {}): IOtp {
  return {
    id: 'otp-1',
    phone: PHONE,
    codeHash: `hash:${CODE}`,
    expiresAt: new Date(clock.now().getTime() + 300_000),
    attempts: 0,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

beforeEach(() => {
  clock = new FixedClock();
  otpRepositoryRead = {
    findLatestOtpByPhone: jest.fn().mockResolvedValue(null),
    findActiveOtpByPhone: jest.fn(),
    listOtpCreationDatesSince: jest.fn().mockResolvedValue([]),
  };
  otpRepositoryWrite = {
    createOtp: jest.fn(async (otp) => otp),
    incrementOtpAttempts: jest.fn(),
    consumeOtp: jest.fn(),
    expireActiveOtps: jest.fn(),
  };
  smsProvider = { sendSms: jest.fn() };
  otpCodeGenerator = {
    generateOtpCode: jest.fn().mockReturnValue(CODE),
    hashOtpCode: jest.fn((code) => `hash:${code}`),
    isOtpCodeMatch: jest.fn((code, hash) => hash === `hash:${code}`),
  };
});

describe('When we request an OTP code', () => {
  it('should store only the hash, invalidate older codes and send the SMS', async () => {
    const result = await createService().requestOtpCode('(11) 99999-8888');

    expect(result).toEqual({
      phone: PHONE,
      expiresInSeconds: 300,
      retryAfterSeconds: 60,
    });
    expect(otpRepositoryWrite.expireActiveOtps).toHaveBeenCalledWith(
      PHONE,
      clock.now(),
    );
    expect(otpRepositoryWrite.createOtp).toHaveBeenCalledWith(
      expect.objectContaining({ phone: PHONE, codeHash: `hash:${CODE}` }),
    );
    expect(smsProvider.sendSms).toHaveBeenCalledWith({
      to: PHONE,
      message: expect.stringContaining(CODE),
    });
  });

  it('should expose the code only in demo mode (OTP-R07)', async () => {
    const result = await createService(true).requestOtpCode(PHONE);

    expect(result.debugCode).toBe(CODE);
  });

  it('should throw INVALID_PHONE for a landline (OTP-R01)', async () => {
    await expect(createService().requestOtpCode('1133334444')).rejects.toThrow(
      BusinessRuleError,
    );
  });

  it('should throw OTP_TOO_SOON with the remaining seconds (OTP-R03)', async () => {
    otpRepositoryRead.findLatestOtpByPhone.mockResolvedValue(anOtp());
    clock.advanceSeconds(20);

    const error = await createService()
      .requestOtpCode(PHONE)
      .catch((caught) => caught);

    expect(error).toBeInstanceOf(TooManyRequestsError);
    expect(error).toMatchObject({
      code: 'OTP_TOO_SOON',
      retryAfterSeconds: 40,
    });
  });

  it('should throw OTP_HOURLY_LIMIT after 5 requests in one hour (OTP-R03)', async () => {
    const tenMinutesAgo = new Date(clock.now().getTime() - 600_000);
    otpRepositoryRead.listOtpCreationDatesSince.mockResolvedValue(
      Array(5).fill(tenMinutesAgo),
    );

    const error = await createService()
      .requestOtpCode(PHONE)
      .catch((caught) => caught);

    expect(error).toMatchObject({
      code: 'OTP_HOURLY_LIMIT',
      retryAfterSeconds: 3000,
    });
  });
});

describe('When we verify an OTP code', () => {
  it('should consume a valid code and return the normalized phone', async () => {
    otpRepositoryRead.findActiveOtpByPhone.mockResolvedValue(anOtp());

    const phone = await createService().verifyOtpCode({
      phone: '11 99999-8888',
      code: CODE,
    });

    expect(phone).toBe(PHONE);
    expect(otpRepositoryWrite.consumeOtp).toHaveBeenCalledWith(
      'otp-1',
      clock.now(),
    );
  });

  it('should throw OTP_INVALID when there is no active code', async () => {
    otpRepositoryRead.findActiveOtpByPhone.mockResolvedValue(null);

    await expect(
      createService().verifyOtpCode({ phone: PHONE, code: CODE }),
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw OTP_INVALID for an invalid phone', async () => {
    await expect(
      createService().verifyOtpCode({ phone: 'abc', code: CODE }),
    ).rejects.toMatchObject({ code: 'OTP_INVALID' });
  });

  it('should count a wrong attempt and throw OTP_INVALID (OTP-R04)', async () => {
    otpRepositoryRead.findActiveOtpByPhone.mockResolvedValue(anOtp());
    otpRepositoryWrite.incrementOtpAttempts.mockResolvedValue(1);

    await expect(
      createService().verifyOtpCode({ phone: PHONE, code: '000000' }),
    ).rejects.toMatchObject({ code: 'OTP_INVALID' });
    expect(otpRepositoryWrite.consumeOtp).not.toHaveBeenCalled();
  });

  it('should lock and expire the code on the fifth wrong attempt', async () => {
    otpRepositoryRead.findActiveOtpByPhone.mockResolvedValue(
      anOtp({ attempts: 4 }),
    );
    otpRepositoryWrite.incrementOtpAttempts.mockResolvedValue(5);

    await expect(
      createService().verifyOtpCode({ phone: PHONE, code: '000000' }),
    ).rejects.toMatchObject({ code: 'OTP_LOCKED' });
    expect(otpRepositoryWrite.expireActiveOtps).toHaveBeenCalledWith(
      PHONE,
      clock.now(),
    );
  });

  it('should reject even the right code once the attempts are exhausted', async () => {
    otpRepositoryRead.findActiveOtpByPhone.mockResolvedValue(
      anOtp({ attempts: 5 }),
    );

    await expect(
      createService().verifyOtpCode({ phone: PHONE, code: CODE }),
    ).rejects.toMatchObject({ code: 'OTP_LOCKED' });
  });
});
