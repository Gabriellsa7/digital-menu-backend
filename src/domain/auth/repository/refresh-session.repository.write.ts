import { ESubjectType } from '../interfaces/auth-subject.interface';
import { IRefreshSession } from '../interfaces/refresh-session.interface';

export interface IRefreshSessionRepositoryWrite {
  createRefreshSession(session: IRefreshSession): Promise<IRefreshSession>;
  revokeRefreshSessionById(
    id: string,
    revokedAt: Date,
    replacedById?: string,
  ): Promise<boolean>;
  revokeRefreshSessionFamily(familyId: string, revokedAt: Date): Promise<void>;
  revokeRefreshSessionsBySubject(
    subjectId: string,
    subjectType: ESubjectType,
    revokedAt: Date,
  ): Promise<void>;
}
