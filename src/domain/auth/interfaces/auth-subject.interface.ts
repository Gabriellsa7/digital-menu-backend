import { EStaffRole } from '../../staff-user/interfaces/staff-user.interface';

export enum ESubjectType {
  STAFF = 'STAFF',
  CUSTOMER = 'CUSTOMER',
}

export interface IAuthSubject {
  subjectId: string;
  subjectType: ESubjectType;
  role?: EStaffRole;
}

export interface IAccessTokenPayload {
  sub: string;
  typ: ESubjectType;
  role?: EStaffRole;
}
