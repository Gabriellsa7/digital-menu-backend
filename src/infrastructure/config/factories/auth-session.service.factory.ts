import { ESubjectType } from '../../../domain/auth/interfaces/auth-subject.interface';
import { AuthSessionService } from '../../../domain/auth/service/auth-session.service';
import { SystemClock } from '../../common/system.clock';
import { RefreshSessionRepositoryRead } from '../../repository/auth/refresh-session.repository.read';
import { RefreshSessionRepositoryWrite } from '../../repository/auth/refresh-session.repository.write';
import { env } from '../env';
import { TokenServiceFactory } from './token.service.factory';

export class AuthSessionServiceFactory {
  static create() {
    return new AuthSessionService({
      refreshSessionRepositoryRead: new RefreshSessionRepositoryRead(),
      refreshSessionRepositoryWrite: new RefreshSessionRepositoryWrite(),
      tokenService: TokenServiceFactory.create(),
      clock: new SystemClock(),
      refreshTokenTtlDays: {
        [ESubjectType.STAFF]: env.staffRefreshTtlDays,
        [ESubjectType.CUSTOMER]: env.customerRefreshTtlDays,
      },
    });
  }
}
