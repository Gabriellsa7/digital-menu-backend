import { IOtp } from '../interfaces/otp.interface';

export interface IOtpRepositoryWrite {
  createOtp(otp: IOtp): Promise<IOtp>;
  /** @returns The attempts count after the increment */
  incrementOtpAttempts(id: string): Promise<number>;
  consumeOtp(id: string, consumedAt: Date): Promise<void>;
  /** Makes every active code of the phone expire at the given date */
  expireActiveOtps(phone: string, at: Date): Promise<void>;
}
