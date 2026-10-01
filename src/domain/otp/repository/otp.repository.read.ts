import { IOtp } from '../interfaces/otp.interface';

export interface IOtpRepositoryRead {
  findLatestOtpByPhone(phone: string): Promise<IOtp | null>;
  findActiveOtpByPhone(phone: string, now: Date): Promise<IOtp | null>;
  listOtpCreationDatesSince(phone: string, since: Date): Promise<Date[]>;
}
