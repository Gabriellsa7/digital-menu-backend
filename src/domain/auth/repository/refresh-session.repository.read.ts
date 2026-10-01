import { IRefreshSession } from '../interfaces/refresh-session.interface';

export interface IRefreshSessionRepositoryRead {
  findRefreshSessionByTokenHash(
    tokenHash: string,
  ): Promise<IRefreshSession | null>;
}
