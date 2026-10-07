import {
  IStaffUser,
  IStaffUserWithPassword,
} from '../interfaces/staff-user.interface';

export type TStaffUserUpdatableFields = Partial<
  Pick<IStaffUser, 'name' | 'role' | 'isActive' | 'lastLoginAt'>
>;

export interface IStaffUserRepositoryWrite {
  createStaffUser(staffUser: IStaffUserWithPassword): Promise<IStaffUser>;
  updateStaffUserById(
    id: string,
    fields: TStaffUserUpdatableFields,
  ): Promise<IStaffUser | null>;
  updateStaffUserPasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<boolean>;
}
