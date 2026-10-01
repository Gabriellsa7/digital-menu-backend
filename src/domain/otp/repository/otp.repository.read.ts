import { IOtp } from '../interfaces/otp.interface';

export interface IOtpRepositoryRead {
  findLatestOtpByPhone(phone: string): Promise<IOtp | null>;
  /** Latest code for the phone that is neither consumed nor expired */
  findActiveOtpByPhone(phone: string, now: Date): Promise<IOtp | null>;
  listOtpCreationDatesSince(phone: string, since: Date): Promise<Date[]>;
}
