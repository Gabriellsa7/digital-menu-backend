import { IClock } from '../../common/clock.interface';
import { IRefreshSessionRepositoryRead } from '../repository/refresh-session.repository.read';
import { IRefreshSessionRepositoryWrite } from '../repository/refresh-session.repository.write';
import { ESubjectType, IAuthSubject } from './auth-subject.interface';
import { ISignedAccessToken, ITokenService } from './token.service.interface';

export interface IAuthTokens {
  accessToken: string;
  accessTokenExpiresInSeconds: number;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface IRotatedSession {
  subjectId: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

export interface IParamsStartSession {
  subject: IAuthSubject;
  userAgent?: string;
}

export interface IParamsRotateSession {
  refreshToken: string;
  subjectType: ESubjectType;
  userAgent?: string;
}

export interface IParamsAuthSessionService {
  refreshSessionRepositoryRead: IRefreshSessionRepositoryRead;
  refreshSessionRepositoryWrite: IRefreshSessionRepositoryWrite;
  tokenService: ITokenService;
  clock: IClock;
  refreshTokenTtlDays: Record<ESubjectType, number>;
}

export interface IAuthSessionService {
  startSession(params: IParamsStartSession): Promise<IAuthTokens>;
  rotateSession(params: IParamsRotateSession): Promise<IRotatedSession>;
  createAccessToken(subject: IAuthSubject): ISignedAccessToken;
  revokeSession(refreshToken: string): Promise<void>;
  revokeAllSessionsForSubject(
    subjectId: string,
    subjectType: ESubjectType,
  ): Promise<void>;
}
