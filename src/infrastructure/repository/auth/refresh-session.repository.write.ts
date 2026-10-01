import { ESubjectType } from '../../../domain/auth/interfaces/auth-subject.interface';
import { IRefreshSession } from '../../../domain/auth/interfaces/refresh-session.interface';
import { IRefreshSessionRepositoryWrite } from '../../../domain/auth/repository/refresh-session.repository.write';
import { MrefreshSession } from '../../db/mongo/models/refresh-session.model';

const ACTIVE_SESSION = { revokedAt: { $exists: false } };

export class RefreshSessionRepositoryWrite
  implements IRefreshSessionRepositoryWrite
{
  /**
   * Create a new refresh session
   * @param session - The session to create
   * @returns The created session
   */
  async createRefreshSession(
    session: IRefreshSession,
  ): Promise<IRefreshSession> {
    const created = await MrefreshSession.create(session);
    const { _id, __v, ...createdSession } = created.toObject();
    return createdSession;
  }

  /**
   * Revoke a session only if it is still active
   * @param id - The session ID
   * @param revokedAt - When it was revoked
   * @param replacedById - The session that replaced it after a rotation
   * @returns true when this call revoked it
   */
  async revokeRefreshSessionById(
    id: string,
    revokedAt: Date,
    replacedById?: string,
  ): Promise<boolean> {
    const { modifiedCount } = await MrefreshSession.updateOne(
      { id, ...ACTIVE_SESSION },
      { $set: { revokedAt, ...(replacedById && { replacedById }) } },
    );
    return modifiedCount === 1;
  }

  /**
   * Revoke every active session of a rotation family
   * @param familyId - The family ID
   * @param revokedAt - When they were revoked
   */
  async revokeRefreshSessionFamily(
    familyId: string,
    revokedAt: Date,
  ): Promise<void> {
    await MrefreshSession.updateMany(
      { familyId, ...ACTIVE_SESSION },
      { $set: { revokedAt } },
    );
  }

  /**
   * Revoke every active session of a subject
   * @param subjectId - The subject's ID
   * @param subjectType - Staff user or customer
   * @param revokedAt - When they were revoked
   */
  async revokeRefreshSessionsBySubject(
    subjectId: string,
    subjectType: ESubjectType,
    revokedAt: Date,
  ): Promise<void> {
    await MrefreshSession.updateMany(
      { subjectId, subjectType, ...ACTIVE_SESSION },
      { $set: { revokedAt } },
    );
  }
}
