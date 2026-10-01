import { IRefreshSession } from '../../../domain/auth/interfaces/refresh-session.interface';
import { IRefreshSessionRepositoryRead } from '../../../domain/auth/repository/refresh-session.repository.read';
import { MrefreshSession } from '../../db/mongo/models/refresh-session.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class RefreshSessionRepositoryRead
  implements IRefreshSessionRepositoryRead
{
  async findRefreshSessionByTokenHash(
    tokenHash: string,
  ): Promise<IRefreshSession | null> {
    return MrefreshSession.findOne(
      { tokenHash },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IRefreshSession>();
  }
}
