import {
  EStaffRole,
  IStaffUser,
} from '../../../domain/staff-user/interfaces/staff-user.interface';

export interface IStaffUserResponse {
  id: string;
  name: string;
  email: string;
  role: EStaffRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
}

export function toStaffUserResponse(staffUser: IStaffUser): IStaffUserResponse {
  return {
    id: staffUser.id,
    name: staffUser.name,
    email: staffUser.email,
    role: staffUser.role,
    isActive: staffUser.isActive,
    ...(staffUser.lastLoginAt && { lastLoginAt: staffUser.lastLoginAt }),
    createdAt: staffUser.createdAt,
  };
}
