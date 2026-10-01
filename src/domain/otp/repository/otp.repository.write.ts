import { IOtp } from '../interfaces/otp.interface';

export interface IOtpRepositoryWrite {
  createOtp(otp: IOtp): Promise<IOtp>;
  incrementOtpAttempts(id: string): Promise<number>;
  consumeOtp(id: string, consumedAt: Date): Promise<void>;
  expireActiveOtps(phone: string, at: Date): Promise<void>;
}
