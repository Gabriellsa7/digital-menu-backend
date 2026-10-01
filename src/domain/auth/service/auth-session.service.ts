import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { Logger } from 'traceability';
import { IClock } from '../../common/clock.interface';
import { UnauthorizedError } from '../../errors/unauthorized.error';
import {
  ESubjectType,
  IAuthSubject,
} from '../interfaces/auth-subject.interface';
import {
  IAuthSessionService,
  IAuthTokens,
  IParamsAuthSessionService,
  IParamsRotateSession,
  IParamsStartSession,
  IRotatedSession,
} from '../interfaces/auth-session.service.interface';
import {
  ISignedAccessToken,
  ITokenService,
} from '../interfaces/token.service.interface';
import { RefreshSession } from '../refresh-session.entity';
import { IRefreshSessionRepositoryRead } from '../repository/refresh-session.repository.read';
import { IRefreshSessionRepositoryWrite } from '../repository/refresh-session.repository.write';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export class AuthSessionService implements IAuthSessionService {
  private refreshSessionRepositoryRead: IRefreshSessionRepositoryRead;
  private refreshSessionRepositoryWrite: IRefreshSessionRepositoryWrite;
  private tokenService: ITokenService;
  private clock: IClock;
  private refreshTokenTtlDays: Record<ESubjectType, number>;

  constructor({
    refreshSessionRepositoryRead,
    refreshSessionRepositoryWrite,
    tokenService,
    clock,
    refreshTokenTtlDays,
  }: IParamsAuthSessionService) {
    this.refreshSessionRepositoryRead = refreshSessionRepositoryRead;
    this.refreshSessionRepositoryWrite = refreshSessionRepositoryWrite;
    this.tokenService = tokenService;
    this.clock = clock;
    this.refreshTokenTtlDays = refreshTokenTtlDays;
  }

  @ErrorHandler()
  async startSession({
    subject,
    userAgent,
  }: IParamsStartSession): Promise<IAuthTokens> {
    const { session, refreshToken } = this.buildSession({
      subjectId: subject.subjectId,
      subjectType: subject.subjectType,
      familyId: randomUUID(),
      userAgent,
    });
    await this.refreshSessionRepositoryWrite.createRefreshSession(session);

    const { accessToken, expiresInSeconds } = this.createAccessToken(subject);
    return {
      accessToken,
      accessTokenExpiresInSeconds: expiresInSeconds,
      refreshToken,
      refreshTokenExpiresAt: session.expiresAt,
    };
  }

  @ErrorHandler()
  async rotateSession({
    refreshToken,
    subjectType,
    userAgent,
  }: IParamsRotateSession): Promise<IRotatedSession> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const storedSession =
      await this.refreshSessionRepositoryRead.findRefreshSessionByTokenHash(
        tokenHash,
      );
    if (!storedSession || storedSession.subjectType !== subjectType) {
      throw new UnauthorizedError('Invalid session', 'SESSION_INVALID');
    }

    const now = this.clock.now();
    const currentSession = new RefreshSession(storedSession);
    if (currentSession.isExpiredAt(now)) {
      throw new UnauthorizedError('Session expired', 'SESSION_EXPIRED');
    }

    const { session: nextSession, refreshToken: nextRefreshToken } =
      this.buildSession({
        subjectId: currentSession.subjectId,
        subjectType: currentSession.subjectType,
        familyId: currentSession.familyId,
        userAgent,
      });

    const wasActive =
      !currentSession.revokedAt &&
      (await this.refreshSessionRepositoryWrite.revokeRefreshSessionById(
        currentSession.id,
        now,
        nextSession.id,
      ));
    if (!wasActive) {
      await this.refreshSessionRepositoryWrite.revokeRefreshSessionFamily(
        currentSession.familyId,
        now,
      );
      Logger.warn('Refresh token reuse detected, session family revoked', {
        eventName: 'auth.refresh_token_reused',
        subjectId: currentSession.subjectId,
        subjectType: currentSession.subjectType,
      });
      throw new UnauthorizedError('Session revoked', 'SESSION_REVOKED');
    }

    await this.refreshSessionRepositoryWrite.createRefreshSession(nextSession);
    return {
      subjectId: currentSession.subjectId,
      refreshToken: nextRefreshToken,
      refreshTokenExpiresAt: nextSession.expiresAt,
    };
  }

  @ErrorHandler()
  createAccessToken(subject: IAuthSubject): ISignedAccessToken {
    return this.tokenService.signAccessToken({
      sub: subject.subjectId,
      typ: subject.subjectType,
      ...(subject.role && { role: subject.role }),
    });
  }

  @ErrorHandler()
  async revokeSession(refreshToken: string): Promise<void> {
    const tokenHash = this.tokenService.hashRefreshToken(refreshToken);
    const session =
      await this.refreshSessionRepositoryRead.findRefreshSessionByTokenHash(
        tokenHash,
      );
    if (!session) {
      return;
    }
    await this.refreshSessionRepositoryWrite.revokeRefreshSessionById(
      session.id,
      this.clock.now(),
    );
  }

  @ErrorHandler()
  async revokeAllSessionsForSubject(
    subjectId: string,
    subjectType: ESubjectType,
  ): Promise<void> {
    await this.refreshSessionRepositoryWrite.revokeRefreshSessionsBySubject(
      subjectId,
      subjectType,
      this.clock.now(),
    );
  }

  private buildSession(params: {
    subjectId: string;
    subjectType: ESubjectType;
    familyId: string;
    userAgent?: string;
  }): { session: RefreshSession; refreshToken: string } {
    const now = this.clock.now();
    const refreshToken = this.tokenService.generateRefreshToken();
    const ttlDays = this.refreshTokenTtlDays[params.subjectType];

    const session = new RefreshSession({
      id: randomUUID(),
      subjectId: params.subjectId,
      subjectType: params.subjectType,
      tokenHash: this.tokenService.hashRefreshToken(refreshToken),
      familyId: params.familyId,
      expiresAt: new Date(now.getTime() + ttlDays * MILLISECONDS_PER_DAY),
      userAgent: params.userAgent,
      createdAt: now,
      updatedAt: now,
    });
    return { session, refreshToken };
  }
}
