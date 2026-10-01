import { ICustomer } from '../../customer/interfaces/customer.interface';
import { ICustomerService } from '../../customer/interfaces/customer.service.interface';
import {
  IOtpCodeRequest,
  IOtpService,
} from '../../otp/interfaces/otp.service.interface';
import {
  IAuthSessionService,
  IAuthTokens,
} from './auth-session.service.interface';
import { IGoogleIdentityVerifier } from './google-identity.verifier.interface';

export interface ICustomerAuthResult {
  customer: ICustomer;
  isNew: boolean;
  tokens: IAuthTokens;
}

export interface IParamsLoginWithOtp {
  phone: string;
  code: string;
  userAgent?: string;
}

export interface IParamsLoginWithGoogle {
  idToken: string;
  userAgent?: string;
}

export interface IParamsRefreshCustomerSession {
  refreshToken: string;
  userAgent?: string;
}

export interface IParamsCustomerAuthService {
  customerService: ICustomerService;
  otpService: IOtpService;
  authSessionService: IAuthSessionService;
  googleIdentityVerifier: IGoogleIdentityVerifier;
}

export interface ICustomerAuthService {
  requestOtpCode(phone: string): Promise<IOtpCodeRequest>;
  loginWithOtp(params: IParamsLoginWithOtp): Promise<ICustomerAuthResult>;
  loginWithGoogle(params: IParamsLoginWithGoogle): Promise<ICustomerAuthResult>;
  linkGoogleAccount(customerId: string, idToken: string): Promise<ICustomer>;
  refreshSession(params: IParamsRefreshCustomerSession): Promise<IAuthTokens>;
  logout(refreshToken?: string): Promise<void>;
}
