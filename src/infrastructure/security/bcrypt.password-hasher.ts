import bcrypt from 'bcryptjs';
import { IPasswordHasher } from '../../domain/common/password-hasher.interface';

export class BcryptPasswordHasher implements IPasswordHasher {
  constructor(private readonly rounds: number) {}

  hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.rounds);
  }

  isPasswordMatch(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(password, passwordHash);
  }
}
