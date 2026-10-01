export interface IOtpCodeGenerator {
  /** Random 6-digit code */
  generateOtpCode(): string;
  /** Only this hash is persisted (OTP-R02) */
  hashOtpCode(code: string): string;
  /** Constant-time comparison against a stored hash */
  isOtpCodeMatch(code: string, codeHash: string): boolean;
}
