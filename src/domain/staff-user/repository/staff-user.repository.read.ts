import {
  IStaffUser,
  IStaffUserWithPassword,
} from '../interfaces/staff-user.interface';

export interface IStaffUserRepositoryRead {
  findStaffUserById(id: string): Promise<IStaffUser | null>;
  findStaffUserByIdWithPassword(
    id: string,
  ): Promise<IStaffUserWithPassword | null>;
  findStaffUserByEmail(email: string): Promise<IStaffUser | null>;
  findStaffUserByEmailWithPassword(
    email: string,
  ): Promise<IStaffUserWithPassword | null>;
  listStaffUsers(): Promise<IStaffUser[]>;
  countActiveOwners(): Promise<number>;
}
