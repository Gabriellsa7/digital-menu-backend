import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { ICustomer } from '../../customer/interfaces/customer.interface';
import { ICustomerService } from '../../customer/interfaces/customer.service.interface';
import { NotFoundError } from '../../errors/not-found.error';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import {
  IOtpCodeRequest,
  IOtpService,
} from '../../otp/interfaces/otp.service.interface';
import { ESubjectType } from '../interfaces/auth-subject.interface';
import {
  IAuthSessionService,
  IAuthTokens,
} from '../interfaces/auth-session.service.interface';
import {
  ICustomerAuthResult,
  ICustomerAuthService,
  IParamsCustomerAuthService,
  IParamsLoginWithGoogle,
  IParamsLoginWithOtp,
  IParamsRefreshCustomerSession,
} from '../interfaces/customer-auth.service.interface';
import { IGoogleIdentityVerifier } from '../interfaces/google-identity.verifier.interface';

export class CustomerAuthService implements ICustomerAuthService {
  private customerService: ICustomerService;
  private otpService: IOtpService;
  private authSessionService: IAuthSessionService;
  private googleIdentityVerifier: IGoogleIdentityVerifier;

  constructor({
    customerService,
    otpService,
    authSessionService,
    googleIdentityVerifier,
  }: IParamsCustomerAuthService) {
    this.customerService = customerService;
    this.otpService = otpService;
    this.authSessionService = authSessionService;
    this.googleIdentityVerifier = googleIdentityVerifier;
  }

  @ErrorHandler()
  async requestOtpCode(phone: string): Promise<IOtpCodeRequest> {
    return this.otpService.requestOtpCode(phone);
  }

  @ErrorHandler()
  async loginWithOtp({
    phone,
    code,
    userAgent,
  }: IParamsLoginWithOtp): Promise<ICustomerAuthResult> {
    const verifiedPhone = await this.otpService.verifyOtpCode({ phone, code });
    const { customer, isNew } =
      await this.customerService.findOrCreateCustomerByVerifiedPhone(
        verifiedPhone,
      );
    return {
      customer,
      isNew,
      tokens: await this.startSession(customer, userAgent),
    };
  }

  @ErrorHandler()
  async loginWithGoogle({
    idToken,
    userAgent,
  }: IParamsLoginWithGoogle): Promise<ICustomerAuthResult> {
    const profile = await this.googleIdentityVerifier.verifyIdToken(idToken);
    const { customer, isNew } =
      await this.customerService.findOrCreateCustomerByGoogle(profile);
    return {
      customer,
      isNew,
      tokens: await this.startSession(customer, userAgent),
    };
  }

  @ErrorHandler()
  async linkGoogleAccount(
    customerId: string,
    idToken: string,
  ): Promise<ICustomer> {
    const profile = await this.googleIdentityVerifier.verifyIdToken(idToken);
    return this.customerService.linkGoogleAccount(customerId, profile);
  }

  @ErrorHandler()
  async refreshSession({
    refreshToken,
    userAgent,
  }: IParamsRefreshCustomerSession): Promise<IAuthTokens> {
    const rotated = await this.authSessionService.rotateSession({
      refreshToken,
      subjectType: ESubjectType.CUSTOMER,
      userAgent,
    });
    await this.assertCustomerExists(rotated.subjectId);

    const { accessToken, expiresInSeconds } =
      this.authSessionService.createAccessToken({
        subjectId: rotated.subjectId,
        subjectType: ESubjectType.CUSTOMER,
      });
    return {
      accessToken,
      accessTokenExpiresInSeconds: expiresInSeconds,
      refreshToken: rotated.refreshToken,
      refreshTokenExpiresAt: rotated.refreshTokenExpiresAt,
    };
  }

  @ErrorHandler()
  async logout(refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await this.authSessionService.revokeSession(refreshToken);
    }
  }

  private startSession(
    customer: ICustomer,
    userAgent?: string,
  ): Promise<IAuthTokens> {
    return this.authSessionService.startSession({
      subject: {
        subjectId: customer.id,
        subjectType: ESubjectType.CUSTOMER,
      },
      userAgent,
    });
  }

  private async assertCustomerExists(customerId: string): Promise<void> {
    await this.customerService.getCustomerById(customerId).catch((error) => {
      if (error instanceof NotFoundError) {
        throw new UnauthorizedError('Invalid session', 'SESSION_INVALID');
      }
      throw error;
    });
  }
}
