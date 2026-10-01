import { ESubjectType } from './auth-subject.interface';

export interface IRefreshSession {
  id: string;
  subjectId: string;
  subjectType: ESubjectType;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedById?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}
