import { ISmsProvider } from '../../../domain/otp/interfaces/sms.provider.interface';
import { OtpService } from '../../../domain/otp/service/otp.service';
import { SystemClock } from '../../common/system.clock';
import { OtpRepositoryRead } from '../../repository/otp/otp.repository.read';
import { OtpRepositoryWrite } from '../../repository/otp/otp.repository.write';
import { CryptoOtpCodeGenerator } from '../../security/crypto.otp-code.generator';
import { MockSmsProvider } from '../../sms/mock.sms.provider';
import { env } from '../env';

export class OtpServiceFactory {
  static create(smsProvider: ISmsProvider = new MockSmsProvider()) {
    return new OtpService({
      otpRepositoryRead: new OtpRepositoryRead(),
      otpRepositoryWrite: new OtpRepositoryWrite(),
      smsProvider,
      otpCodeGenerator: new CryptoOtpCodeGenerator(env.otpPepper),
      clock: new SystemClock(),
      exposeCode: env.otpExposeCode,
    });
  }
}
