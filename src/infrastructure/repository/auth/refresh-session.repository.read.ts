import { IRefreshSession } from '../../../domain/auth/interfaces/refresh-session.interface';
import { IRefreshSessionRepositoryRead } from '../../../domain/auth/repository/refresh-session.repository.read';
import { MrefreshSession } from '../../db/mongo/models/refresh-session.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class RefreshSessionRepositoryRead
  implements IRefreshSessionRepositoryRead
{
  /**
   * Find a session by the hash of its refresh token
   * @param tokenHash - SHA-256 of the refresh token
   * @returns The session or null if not found
   */
  async findRefreshSessionByTokenHash(
    tokenHash: string,
  ): Promise<IRefreshSession | null> {
    return MrefreshSession.findOne(
      { tokenHash },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IRefreshSession>();
  }
}
