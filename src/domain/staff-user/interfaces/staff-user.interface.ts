export enum EStaffRole {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export interface IStaffUser {
  id: string;
  name: string;
  email: string;
  role: EStaffRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Kept apart from IStaffUser so the hash is only loaded by the login flow
// and can never leak through a regular read or API response.
export interface IStaffUserWithPassword extends IStaffUser {
  passwordHash: string;
}
