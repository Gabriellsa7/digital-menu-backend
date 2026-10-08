import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { Logger } from 'traceability';
import { IAuthSessionService } from '../../auth/interfaces/auth-session.service.interface';
import { ESubjectType } from '../../auth/interfaces/auth-subject.interface';
import { IClock } from '../../common/clock.interface';
import { IPasswordHasher } from '../../common/password-hasher.interface';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { ConflictError } from '../../errors/conflict.error';
import { NotFoundError } from '../../errors/not-found.error';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import { EStaffRole, IStaffUser } from '../interfaces/staff-user.interface';
import {
  IParamsChangeStaffUserPassword,
  IParamsCreateStaffUser,
  IParamsSetStaffUserActive,
  IParamsStaffUserService,
  IParamsUpdateStaffUser,
  IParamsVerifyStaffUserCredentials,
  IStaffUserService,
} from '../interfaces/staff-user.service.interface';
import { IStaffUserRepositoryRead } from '../repository/staff-user.repository.read';
import {
  IStaffUserRepositoryWrite,
  TStaffUserUpdatableFields,
} from '../repository/staff-user.repository.write';
import { StaffUser } from '../staff-user.entity';

export class StaffUserService implements IStaffUserService {
  private staffUserRepositoryRead: IStaffUserRepositoryRead;
  private staffUserRepositoryWrite: IStaffUserRepositoryWrite;
  private passwordHasher: IPasswordHasher;
  private authSessionService: IAuthSessionService;
  private clock: IClock;

  constructor({
    staffUserRepositoryRead,
    staffUserRepositoryWrite,
    passwordHasher,
    authSessionService,
    clock,
  }: IParamsStaffUserService) {
    this.staffUserRepositoryRead = staffUserRepositoryRead;
    this.staffUserRepositoryWrite = staffUserRepositoryWrite;
    this.passwordHasher = passwordHasher;
    this.authSessionService = authSessionService;
    this.clock = clock;
  }

  @ErrorHandler()
  async createStaffUser({
    storeId,
    name,
    email,
    password,
    role,
  }: IParamsCreateStaffUser): Promise<IStaffUser> {
    StaffUser.assertStrongPassword(password);
    const normalizedEmail = StaffUser.normalizeEmail(email);
    const existing =
      await this.staffUserRepositoryRead.findStaffUserByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError(
        'E-mail is already in use',
        'EMAIL_ALREADY_IN_USE',
      );
    }

    const now = this.clock.now();
    const created = await this.staffUserRepositoryWrite.createStaffUser({
      id: randomUUID(),
      storeId,
      name: name.trim(),
      email: normalizedEmail,
      passwordHash: await this.passwordHasher.hashPassword(password),
      role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    Logger.info('Staff user created', {
      eventName: 'staff_user.created',
      staffUserId: created.id,
      storeId,
      role: created.role,
    });
    return created;
  }

  @ErrorHandler()
  async listStaffUsers(storeId: string): Promise<IStaffUser[]> {
    return this.staffUserRepositoryRead.listStaffUsers(storeId);
  }

  @ErrorHandler()
  async getStaffUserById(id: string): Promise<IStaffUser> {
    const staffUser = await this.staffUserRepositoryRead.findStaffUserById(id);

    return staffUser ? staffUser : this.throwStaffUserNotFound();
  }

  @ErrorHandler()
  async getStaffUserInStore(storeId: string, id: string): Promise<IStaffUser> {
    const staffUser = await this.staffUserRepositoryRead.findStaffUserById(id);

    return staffUser?.storeId === storeId
      ? staffUser
      : this.throwStaffUserNotFound();
  }

  @ErrorHandler()
  async updateStaffUser({
    storeId,
    id,
    name,
    role,
  }: IParamsUpdateStaffUser): Promise<IStaffUser> {
    const staffUser = new StaffUser(await this.getStaffUserInStore(storeId, id));
    if (role === EStaffRole.STAFF && staffUser.isActiveOwner()) {
      await this.assertNotLastOwner(storeId);
    }

    return this.updateStaffUserFields(id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(role !== undefined && { role }),
    });
  }

  @ErrorHandler()
  async setStaffUserActive({
    storeId,
    id,
    isActive,
  }: IParamsSetStaffUserActive): Promise<IStaffUser> {
    const staffUser = new StaffUser(await this.getStaffUserInStore(storeId, id));
    if (staffUser.isActive === isActive) {
      return staffUser;
    }
    if (!isActive && staffUser.isActiveOwner()) {
      await this.assertNotLastOwner(storeId);
    }

    const updated = await this.updateStaffUserFields(id, { isActive });
    if (!isActive) {
      await this.authSessionService.revokeAllSessionsForSubject(
        id,
        ESubjectType.STAFF,
      );
    }
    return updated;
  }

  @ErrorHandler()
  async changeStaffUserPassword({
    id,
    currentPassword,
    newPassword,
  }: IParamsChangeStaffUserPassword): Promise<void> {
    const staffUser =
      await this.staffUserRepositoryRead.findStaffUserByIdWithPassword(id);
    if (!staffUser) {
      this.throwStaffUserNotFound();
    }
    const isCurrentPasswordValid = await this.passwordHasher.isPasswordMatch(
      currentPassword,
      staffUser.passwordHash,
    );
    if (!isCurrentPasswordValid) {
      throw new BusinessRuleError(
        'Current password is incorrect',
        'INVALID_CURRENT_PASSWORD',
      );
    }
    StaffUser.assertStrongPassword(newPassword);

    await this.staffUserRepositoryWrite.updateStaffUserPasswordHash(
      id,
      await this.passwordHasher.hashPassword(newPassword),
    );
  }

  @ErrorHandler()
  async verifyStaffUserCredentials({
    email,
    password,
  }: IParamsVerifyStaffUserCredentials): Promise<IStaffUser> {
    const staffUser =
      await this.staffUserRepositoryRead.findStaffUserByEmailWithPassword(
        StaffUser.normalizeEmail(email),
      );
    const isPasswordValid =
      staffUser !== null &&
      (await this.passwordHasher.isPasswordMatch(
        password,
        staffUser.passwordHash,
      ));
    if (!staffUser || !isPasswordValid) {
      throw new UnauthorizedError('Invalid credentials', 'INVALID_CREDENTIALS');
    }
    if (!staffUser.isActive) {
      throw new UnauthorizedError('User is inactive', 'USER_INACTIVE');
    }

    return this.updateStaffUserFields(staffUser.id, {
      lastLoginAt: this.clock.now(),
    });
  }

  @ErrorHandler()
  async hasOwner(storeId: string): Promise<boolean> {
    return (await this.staffUserRepositoryRead.countActiveOwners(storeId)) > 0;
  }

  private async assertNotLastOwner(storeId: string): Promise<void> {
    const activeOwners =
      await this.staffUserRepositoryRead.countActiveOwners(storeId);
    if (activeOwners <= 1) {
      throw new BusinessRuleError(
        'The last active owner cannot be deactivated or demoted',
        'LAST_OWNER',
      );
    }
  }

  private async updateStaffUserFields(
    id: string,
    fields: TStaffUserUpdatableFields,
  ): Promise<IStaffUser> {
    const updated = await this.staffUserRepositoryWrite.updateStaffUserById(
      id,
      fields,
    );

    return updated ? updated : this.throwStaffUserNotFound();
  }

  private throwStaffUserNotFound(): never {
    throw new NotFoundError('Staff user not found');
  }
}
