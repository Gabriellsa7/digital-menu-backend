export interface IPasswordHasher {
  hashPassword(password: string): Promise<string>;
  isPasswordMatch(password: string, passwordHash: string): Promise<boolean>;
}
