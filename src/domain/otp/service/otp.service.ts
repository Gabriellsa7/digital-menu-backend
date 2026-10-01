import { randomUUID } from 'crypto';
import { Logger } from 'traceability';
import { IClock } from '../../common/clock.interface';
import { normalizeBrazilianMobile } from '../../common/phone';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { TooManyRequestsError } from '../../errors/too-many-requests.error';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import { IOtpCodeGenerator } from '../interfaces/otp-code.generator.interface';
import {
  IOtpCodeRequest,
  IOtpService,
  IParamsOtpService,
  IParamsVerifyOtpCode,
} from '../interfaces/otp.service.interface';
import { ISmsProvider } from '../interfaces/sms.provider.interface';
import { MAX_OTP_ATTEMPTS, Otp } from '../otp.entity';
import { IOtpRepositoryRead } from '../repository/otp.repository.read';
import { IOtpRepositoryWrite } from '../repository/otp.repository.write';

const OTP_TTL_SECONDS = 5 * 60;
const RESEND_INTERVAL_SECONDS = 60;
const MAX_REQUESTS_PER_HOUR = 5;
const ONE_HOUR_SECONDS = 60 * 60;

export class OtpService implements IOtpService {
  private otpRepositoryRead: IOtpRepositoryRead;
  private otpRepositoryWrite: IOtpRepositoryWrite;
  private smsProvider: ISmsProvider;
  private otpCodeGenerator: IOtpCodeGenerator;
  private clock: IClock;
  private exposeCode: boolean;

  constructor({
    otpRepositoryRead,
    otpRepositoryWrite,
    smsProvider,
    otpCodeGenerator,
    clock,
    exposeCode,
  }: IParamsOtpService) {
    this.otpRepositoryRead = otpRepositoryRead;
    this.otpRepositoryWrite = otpRepositoryWrite;
    this.smsProvider = smsProvider;
    this.otpCodeGenerator = otpCodeGenerator;
    this.clock = clock;
    this.exposeCode = exposeCode;
  }

  /**
   * Send a new login code by SMS (OTP-R01..R03, R06, R07)
   * @param phone - The phone in any Brazilian format
   * @returns When the code expires and when a new one can be requested
   * @throws BusinessRuleError INVALID_PHONE when it is not a BR mobile
   * @throws TooManyRequestsError when the phone is throttled
   */
  async requestOtpCode(phone: string): Promise<IOtpCodeRequest> {
    const normalizedPhone = normalizeBrazilianMobile(phone);
    if (!normalizedPhone) {
      throw new BusinessRuleError(
        'Phone must be a valid Brazilian mobile number',
        'INVALID_PHONE',
      );
    }
    const now = this.clock.now();
    await this.assertNotThrottled(normalizedPhone, now);

    await this.otpRepositoryWrite.expireActiveOtps(normalizedPhone, now);
    const code = this.otpCodeGenerator.generateOtpCode();
    await this.otpRepositoryWrite.createOtp(
      new Otp({
        id: randomUUID(),
        phone: normalizedPhone,
        codeHash: this.otpCodeGenerator.hashOtpCode(code),
        expiresAt: new Date(now.getTime() + OTP_TTL_SECONDS * 1000),
        attempts: 0,
        createdAt: now,
        updatedAt: now,
      }),
    );
    await this.smsProvider.sendSms({
      to: normalizedPhone,
      message: `Digital Menu: your code is ${code}. It expires in 5 minutes.`,
    });
    Logger.info('OTP code requested', { eventName: 'otp.requested' });

    return {
      phone: normalizedPhone,
      expiresInSeconds: OTP_TTL_SECONDS,
      retryAfterSeconds: RESEND_INTERVAL_SECONDS,
      ...(this.exposeCode && { debugCode: code }),
    };
  }

  /**
   * Check a login code and consume it (OTP-R04, R05)
   * @param params - The phone and the code typed by the customer
   * @returns The verified phone in E.164
   * @throws UnauthorizedError OTP_INVALID when the code is wrong or expired
   * @throws BusinessRuleError OTP_LOCKED after too many wrong attempts
   */
  async verifyOtpCode({ phone, code }: IParamsVerifyOtpCode): Promise<string> {
    const normalizedPhone = normalizeBrazilianMobile(phone);
    const now = this.clock.now();
    const storedOtp =
      normalizedPhone &&
      (await this.otpRepositoryRead.findActiveOtpByPhone(normalizedPhone, now));
    if (!normalizedPhone || !storedOtp) {
      throw this.invalidCodeError();
    }

    const otp = new Otp(storedOtp);
    if (otp.hasReachedMaxAttempts()) {
      throw this.lockedError();
    }

    if (!this.otpCodeGenerator.isOtpCodeMatch(code, otp.codeHash)) {
      const attempts = await this.otpRepositoryWrite.incrementOtpAttempts(
        otp.id,
      );
      if (attempts >= MAX_OTP_ATTEMPTS) {
        await this.otpRepositoryWrite.expireActiveOtps(normalizedPhone, now);
        throw this.lockedError();
      }
      throw this.invalidCodeError();
    }

    await this.otpRepositoryWrite.consumeOtp(otp.id, now);
    Logger.info('OTP code verified', { eventName: 'otp.verified' });
    return normalizedPhone;
  }

  private async assertNotThrottled(phone: string, now: Date): Promise<void> {
    const latest = await this.otpRepositoryRead.findLatestOtpByPhone(phone);
    if (latest) {
      const elapsedSeconds =
        (now.getTime() - latest.createdAt.getTime()) / 1000;
      if (elapsedSeconds < RESEND_INTERVAL_SECONDS) {
        throw new TooManyRequestsError(
          'Wait before requesting a new code',
          Math.ceil(RESEND_INTERVAL_SECONDS - elapsedSeconds),
          'OTP_TOO_SOON',
        );
      }
    }

    const windowStart = new Date(now.getTime() - ONE_HOUR_SECONDS * 1000);
    const recentRequests =
      await this.otpRepositoryRead.listOtpCreationDatesSince(
        phone,
        windowStart,
      );
    if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
      const oldest = Math.min(...recentRequests.map((date) => date.getTime()));
      throw new TooManyRequestsError(
        'Too many codes requested for this phone',
        Math.ceil((oldest + ONE_HOUR_SECONDS * 1000 - now.getTime()) / 1000),
        'OTP_HOURLY_LIMIT',
      );
    }
  }

  private invalidCodeError(): UnauthorizedError {
    return new UnauthorizedError('Invalid or expired code', 'OTP_INVALID');
  }

  private lockedError(): BusinessRuleError {
    return new BusinessRuleError(
      'Too many wrong attempts. Request a new code',
      'OTP_LOCKED',
    );
  }
}
