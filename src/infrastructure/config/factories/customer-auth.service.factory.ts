import { IGoogleIdentityVerifier } from '../../../domain/auth/interfaces/google-identity.verifier.interface';
import { CustomerAuthService } from '../../../domain/auth/service/customer-auth.service';
import { ISmsProvider } from '../../../domain/otp/interfaces/sms.provider.interface';
import { GoogleIdentityVerifier } from '../../security/google.identity.verifier';
import { env } from '../env';
import { AuthSessionServiceFactory } from './auth-session.service.factory';
import { CustomerServiceFactory } from './customer.service.factory';
import { OtpServiceFactory } from './otp.service.factory';

/** External adapters tests can replace with fakes */
export interface IParamsCustomerAuthAdapters {
  googleIdentityVerifier?: IGoogleIdentityVerifier;
  smsProvider?: ISmsProvider;
}

export class CustomerAuthServiceFactory {
  static create(adapters: IParamsCustomerAuthAdapters = {}) {
    return new CustomerAuthService({
      customerService: CustomerServiceFactory.create(),
      otpService: OtpServiceFactory.create(adapters.smsProvider),
      authSessionService: AuthSessionServiceFactory.create(),
      googleIdentityVerifier:
        adapters.googleIdentityVerifier ??
        new GoogleIdentityVerifier(env.googleClientId),
    });
  }
}
