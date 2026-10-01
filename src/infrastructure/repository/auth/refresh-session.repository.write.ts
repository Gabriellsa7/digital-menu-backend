import { ESubjectType } from '../../../domain/auth/interfaces/auth-subject.interface';
import { IRefreshSession } from '../../../domain/auth/interfaces/refresh-session.interface';
import { IRefreshSessionRepositoryWrite } from '../../../domain/auth/repository/refresh-session.repository.write';
import { MrefreshSession } from '../../db/mongo/models/refresh-session.model';

const ACTIVE_SESSION = { revokedAt: { $exists: false } };

export class RefreshSessionRepositoryWrite
  implements IRefreshSessionRepositoryWrite
{
  async createRefreshSession(
    session: IRefreshSession,
  ): Promise<IRefreshSession> {
    const created = await MrefreshSession.create(session);
    const { _id, __v, ...createdSession } = created.toObject();
    return createdSession;
  }

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

  async revokeRefreshSessionFamily(
    familyId: string,
    revokedAt: Date,
  ): Promise<void> {
    await MrefreshSession.updateMany(
      { familyId, ...ACTIVE_SESSION },
      { $set: { revokedAt } },
    );
  }

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
