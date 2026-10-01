import { IClock } from '../../common/clock.interface';
import { IOtpRepositoryRead } from '../repository/otp.repository.read';
import { IOtpRepositoryWrite } from '../repository/otp.repository.write';
import { IOtpCodeGenerator } from './otp-code.generator.interface';
import { ISmsProvider } from './sms.provider.interface';

export interface IOtpCodeRequest {
  phone: string;
  expiresInSeconds: number;
  retryAfterSeconds: number;
  debugCode?: string;
}

export interface IParamsVerifyOtpCode {
  phone: string;
  code: string;
}

export interface IParamsOtpService {
  otpRepositoryRead: IOtpRepositoryRead;
  otpRepositoryWrite: IOtpRepositoryWrite;
  smsProvider: ISmsProvider;
  otpCodeGenerator: IOtpCodeGenerator;
  clock: IClock;
  exposeCode: boolean;
}

export interface IOtpService {
  requestOtpCode(phone: string): Promise<IOtpCodeRequest>;
  verifyOtpCode(params: IParamsVerifyOtpCode): Promise<string>;
}
