import { IAuthSessionService } from '../../auth/interfaces/auth-session.service.interface';
import { IClock } from '../../common/clock.interface';
import { IPasswordHasher } from '../../common/password-hasher.interface';
import { IStaffUserRepositoryRead } from '../repository/staff-user.repository.read';
import { IStaffUserRepositoryWrite } from '../repository/staff-user.repository.write';
import { EStaffRole, IStaffUser } from './staff-user.interface';

export interface IParamsCreateStaffUser {
  name: string;
  email: string;
  password: string;
  role: EStaffRole;
}

export interface IParamsUpdateStaffUser {
  id: string;
  name?: string;
  role?: EStaffRole;
}

export interface IParamsSetStaffUserActive {
  id: string;
  isActive: boolean;
}

export interface IParamsChangeStaffUserPassword {
  id: string;
  currentPassword: string;
  newPassword: string;
}

export interface IParamsVerifyStaffUserCredentials {
  email: string;
  password: string;
}

export interface IParamsStaffUserService {
  staffUserRepositoryRead: IStaffUserRepositoryRead;
  staffUserRepositoryWrite: IStaffUserRepositoryWrite;
  passwordHasher: IPasswordHasher;
  authSessionService: IAuthSessionService;
  clock: IClock;
}

export interface IStaffUserService {
  createStaffUser(params: IParamsCreateStaffUser): Promise<IStaffUser>;
  listStaffUsers(): Promise<IStaffUser[]>;
  getStaffUserById(id: string): Promise<IStaffUser>;
  updateStaffUser(params: IParamsUpdateStaffUser): Promise<IStaffUser>;
  setStaffUserActive(params: IParamsSetStaffUserActive): Promise<IStaffUser>;
  changeStaffUserPassword(
    params: IParamsChangeStaffUserPassword,
  ): Promise<void>;
  verifyStaffUserCredentials(
    params: IParamsVerifyStaffUserCredentials,
  ): Promise<IStaffUser>;
  hasOwner(): Promise<boolean>;
}
