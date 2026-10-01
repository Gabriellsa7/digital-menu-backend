import { IOtp } from './interfaces/otp.interface';

export const MAX_OTP_ATTEMPTS = 5;

export class Otp implements IOtp {
  public readonly id: string;
  public readonly phone: string;
  public readonly codeHash: string;
  public readonly expiresAt: Date;
  public readonly attempts: number;
  public readonly consumedAt?: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: IOtp) {
    this.id = props.id;
    this.phone = props.phone;
    this.codeHash = props.codeHash;
    this.expiresAt = props.expiresAt;
    this.attempts = props.attempts;
    this.consumedAt = props.consumedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  hasReachedMaxAttempts(): boolean {
    return this.attempts >= MAX_OTP_ATTEMPTS;
  }
}
