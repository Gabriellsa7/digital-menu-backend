import { BusinessRuleError } from '../errors/business-rule.error';
import { EStaffRole, IStaffUser } from './interfaces/staff-user.interface';

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_LETTER_PATTERN = /[A-Za-z]/;
const PASSWORD_NUMBER_PATTERN = /\d/;

export class StaffUser implements IStaffUser {
  public readonly id: string;
  public readonly storeId: string;
  public readonly name: string;
  public readonly email: string;
  public readonly role: EStaffRole;
  public readonly isActive: boolean;
  public readonly lastLoginAt?: Date;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: IStaffUser) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.name = props.name;
    this.email = props.email;
    this.role = props.role;
    this.isActive = props.isActive;
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isActiveOwner(): boolean {
    return this.isActive && this.role === EStaffRole.OWNER;
  }

  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  static assertStrongPassword(password: string): void {
    const isStrong =
      password.length >= PASSWORD_MIN_LENGTH &&
      PASSWORD_LETTER_PATTERN.test(password) &&
      PASSWORD_NUMBER_PATTERN.test(password);
    if (!isStrong) {
      throw new BusinessRuleError(
        `Password needs at least ${PASSWORD_MIN_LENGTH} characters, with at least 1 letter and 1 number`,
        'WEAK_PASSWORD',
      );
    }
  }
}
