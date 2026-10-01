export interface IOtpCodeGenerator {
  generateOtpCode(): string;
  hashOtpCode(code: string): string;
  isOtpCodeMatch(code: string, codeHash: string): boolean;
}
