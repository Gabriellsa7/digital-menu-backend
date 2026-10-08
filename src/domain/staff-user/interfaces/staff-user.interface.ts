export enum EStaffRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export interface IStaffUser {
  id: string;
  storeId: string;
  name: string;
  email: string;
  role: EStaffRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStaffUserWithPassword extends IStaffUser {
  passwordHash: string;
}
