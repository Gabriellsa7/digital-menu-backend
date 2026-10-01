import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { IOtpCodeGenerator } from '../../domain/otp/interfaces/otp-code.generator.interface';

const OTP_CODE_LENGTH = 6;
const OTP_CODE_UPPER_BOUND = 10 ** OTP_CODE_LENGTH;

export class CryptoOtpCodeGenerator implements IOtpCodeGenerator {
  // The pepper is a server secret, so a leaked database alone is not enough
  // to brute-force the 1M possible codes.
  constructor(private readonly pepper: string) {}

  generateOtpCode(): string {
    return randomInt(0, OTP_CODE_UPPER_BOUND)
      .toString()
      .padStart(OTP_CODE_LENGTH, '0');
  }

  hashOtpCode(code: string): string {
    return createHmac('sha256', this.pepper).update(code).digest('hex');
  }

  isOtpCodeMatch(code: string, codeHash: string): boolean {
    const candidate = Buffer.from(this.hashOtpCode(code), 'hex');
    const stored = Buffer.from(codeHash, 'hex');
    return (
      candidate.length === stored.length && timingSafeEqual(candidate, stored)
    );
  }
}
