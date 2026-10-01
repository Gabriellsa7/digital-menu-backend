import { CustomerAuthService } from '../../domain/auth/service/customer-auth.service';
import { ESubjectType } from '../../domain/auth/interfaces/auth-subject.interface';
import { IAuthSessionService } from '../../domain/auth/interfaces/auth-session.service.interface';
import { IGoogleIdentityVerifier } from '../../domain/auth/interfaces/google-identity.verifier.interface';
import { ICustomer } from '../../domain/customer/interfaces/customer.interface';
import { ICustomerService } from '../../domain/customer/interfaces/customer.service.interface';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { IOtpService } from '../../domain/otp/interfaces/otp.service.interface';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const A_CUSTOMER: ICustomer = {
  id: 'customer-1',
  addresses: [],
  lastLoginAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};
const TOKENS = {
  accessToken: 'access',
  accessTokenExpiresInSeconds: 900,
  refreshToken: 'refresh',
  refreshTokenExpiresAt: NOW,
};
const GOOGLE_PROFILE = { sub: 'google-sub', email: 'nami@gmail.com' };

let customerService: jest.Mocked<
  Pick<
    ICustomerService,
    | 'getCustomerById'
    | 'findOrCreateCustomerByVerifiedPhone'
    | 'findOrCreateCustomerByGoogle'
    | 'linkGoogleAccount'
  >
>;
let otpService: jest.Mocked<IOtpService>;
let authSessionService: jest.Mocked<IAuthSessionService>;
let googleIdentityVerifier: jest.Mocked<IGoogleIdentityVerifier>;
let customerAuthService: CustomerAuthService;

beforeEach(() => {
  customerService = {
    getCustomerById: jest.fn().mockResolvedValue(A_CUSTOMER),
    findOrCreateCustomerByVerifiedPhone: jest
      .fn()
      .mockResolvedValue({ customer: A_CUSTOMER, isNew: true }),
    findOrCreateCustomerByGoogle: jest
      .fn()
      .mockResolvedValue({ customer: A_CUSTOMER, isNew: false }),
    linkGoogleAccount: jest.fn().mockResolvedValue(A_CUSTOMER),
  };
  otpService = {
    requestOtpCode: jest.fn(),
    verifyOtpCode: jest.fn().mockResolvedValue('+5511999998888'),
  };
  authSessionService = {
    startSession: jest.fn().mockResolvedValue(TOKENS),
    rotateSession: jest.fn().mockResolvedValue({
      subjectId: 'customer-1',
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: NOW,
    }),
    createAccessToken: jest
      .fn()
      .mockReturnValue({ accessToken: 'access-2', expiresInSeconds: 900 }),
    revokeSession: jest.fn(),
    revokeAllSessionsForSubject: jest.fn(),
  };
  googleIdentityVerifier = {
    verifyIdToken: jest.fn().mockResolvedValue(GOOGLE_PROFILE),
  };
  customerAuthService = new CustomerAuthService({
    customerService: customerService as unknown as ICustomerService,
    otpService,
    authSessionService,
    googleIdentityVerifier,
  });
});

describe('When a customer logs in with an OTP code', () => {
  it('should verify the code, find or create the customer and start a session', async () => {
    const result = await customerAuthService.loginWithOtp({
      phone: '11999998888',
      code: '123456',
      userAgent: 'jest',
    });

    expect(
      customerService.findOrCreateCustomerByVerifiedPhone,
    ).toHaveBeenCalledWith('+5511999998888');
    expect(authSessionService.startSession).toHaveBeenCalledWith({
      subject: { subjectId: 'customer-1', subjectType: ESubjectType.CUSTOMER },
      userAgent: 'jest',
    });
    expect(result).toEqual({
      customer: A_CUSTOMER,
      isNew: true,
      tokens: TOKENS,
    });
  });

  it('should delegate the code request to the OTP service', async () => {
    await customerAuthService.requestOtpCode('11999998888');

    expect(otpService.requestOtpCode).toHaveBeenCalledWith('11999998888');
  });
});

describe('When a customer uses Google', () => {
  it('should verify the ID token before logging in', async () => {
    const result = await customerAuthService.loginWithGoogle({
      idToken: 'id-token',
    });

    expect(googleIdentityVerifier.verifyIdToken).toHaveBeenCalledWith(
      'id-token',
    );
    expect(customerService.findOrCreateCustomerByGoogle).toHaveBeenCalledWith(
      GOOGLE_PROFILE,
    );
    expect(result.isNew).toBe(false);
  });

  it('should verify the ID token before linking it', async () => {
    await customerAuthService.linkGoogleAccount('customer-1', 'id-token');

    expect(customerService.linkGoogleAccount).toHaveBeenCalledWith(
      'customer-1',
      GOOGLE_PROFILE,
    );
  });
});

describe('When a customer refreshes the session', () => {
  it('should rotate the refresh token and sign a new access token', async () => {
    const tokens = await customerAuthService.refreshSession({
      refreshToken: 'refresh',
    });

    expect(authSessionService.rotateSession).toHaveBeenCalledWith({
      refreshToken: 'refresh',
      subjectType: ESubjectType.CUSTOMER,
      userAgent: undefined,
    });
    expect(tokens).toEqual({
      accessToken: 'access-2',
      accessTokenExpiresInSeconds: 900,
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: NOW,
    });
  });

  it('should throw SESSION_INVALID when the customer no longer exists', async () => {
    customerService.getCustomerById.mockRejectedValue(new NotFoundError());

    await expect(
      customerAuthService.refreshSession({ refreshToken: 'refresh' }),
    ).rejects.toMatchObject({ status: 401, code: 'SESSION_INVALID' });
  });

  it('should rethrow unexpected errors', async () => {
    customerService.getCustomerById.mockRejectedValue(new Error('db down'));

    await expect(
      customerAuthService.refreshSession({ refreshToken: 'refresh' }),
    ).rejects.toThrow('db down');
  });
});

describe('When a customer logs out', () => {
  it('should revoke the session of the refresh token', async () => {
    await customerAuthService.logout('refresh');

    expect(authSessionService.revokeSession).toHaveBeenCalledWith('refresh');
  });

  it('should do nothing without a refresh token', async () => {
    await customerAuthService.logout();

    expect(authSessionService.revokeSession).not.toHaveBeenCalled();
  });
});
