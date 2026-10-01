import { AuthSessionService } from '../../domain/auth/service/auth-session.service';
import { ESubjectType } from '../../domain/auth/interfaces/auth-subject.interface';
import { IRefreshSession } from '../../domain/auth/interfaces/refresh-session.interface';
import { ITokenService } from '../../domain/auth/interfaces/token.service.interface';
import { IRefreshSessionRepositoryRead } from '../../domain/auth/repository/refresh-session.repository.read';
import { IRefreshSessionRepositoryWrite } from '../../domain/auth/repository/refresh-session.repository.write';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error';
import { FixedClock } from '../helpers/fixed.clock';

const CUSTOMER_SUBJECT = {
  subjectId: 'customer-1',
  subjectType: ESubjectType.CUSTOMER,
};

let clock: FixedClock;
let refreshSessionRepositoryRead: jest.Mocked<IRefreshSessionRepositoryRead>;
let refreshSessionRepositoryWrite: jest.Mocked<IRefreshSessionRepositoryWrite>;
let tokenService: jest.Mocked<ITokenService>;
let authSessionService: AuthSessionService;

function aSession(overrides: Partial<IRefreshSession> = {}): IRefreshSession {
  return {
    id: 'session-1',
    subjectId: 'customer-1',
    subjectType: ESubjectType.CUSTOMER,
    tokenHash: 'hash:refresh-1',
    familyId: 'family-1',
    expiresAt: new Date(clock.now().getTime() + 86_400_000),
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

beforeEach(() => {
  clock = new FixedClock();
  refreshSessionRepositoryRead = { findRefreshSessionByTokenHash: jest.fn() };
  refreshSessionRepositoryWrite = {
    createRefreshSession: jest.fn(async (session) => session),
    revokeRefreshSessionById: jest.fn().mockResolvedValue(true),
    revokeRefreshSessionFamily: jest.fn(),
    revokeRefreshSessionsBySubject: jest.fn(),
  };
  tokenService = {
    signAccessToken: jest
      .fn()
      .mockReturnValue({ accessToken: 'access', expiresInSeconds: 900 }),
    verifyAccessToken: jest.fn(),
    generateRefreshToken: jest.fn().mockReturnValue('refresh-2'),
    hashRefreshToken: jest.fn((token) => `hash:${token}`),
  };
  authSessionService = new AuthSessionService({
    refreshSessionRepositoryRead,
    refreshSessionRepositoryWrite,
    tokenService,
    clock,
    refreshTokenTtlDays: {
      [ESubjectType.STAFF]: 7,
      [ESubjectType.CUSTOMER]: 30,
    },
  });
});

describe('When we start a session', () => {
  it('should persist only the token hash and use the subject TTL', async () => {
    const tokens = await authSessionService.startSession({
      subject: CUSTOMER_SUBJECT,
      userAgent: 'jest',
    });

    expect(tokens).toEqual({
      accessToken: 'access',
      accessTokenExpiresInSeconds: 900,
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: new Date('2026-10-31T12:00:00.000Z'),
    });
    expect(
      refreshSessionRepositoryWrite.createRefreshSession,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        tokenHash: 'hash:refresh-2',
        userAgent: 'jest',
      }),
    );
  });

  it('should put the staff role in the access token', () => {
    authSessionService.createAccessToken({
      subjectId: 'staff-1',
      subjectType: ESubjectType.STAFF,
      role: EStaffRole.OWNER,
    });

    expect(tokenService.signAccessToken).toHaveBeenCalledWith({
      sub: 'staff-1',
      typ: ESubjectType.STAFF,
      role: EStaffRole.OWNER,
    });
  });
});

describe('When we rotate a session (AUTH-R04)', () => {
  it('should revoke the current session and create the next one in the same family', async () => {
    refreshSessionRepositoryRead.findRefreshSessionByTokenHash.mockResolvedValue(
      aSession(),
    );

    const rotated = await authSessionService.rotateSession({
      refreshToken: 'refresh-1',
      subjectType: ESubjectType.CUSTOMER,
    });

    const nextSession =
      refreshSessionRepositoryWrite.createRefreshSession.mock.calls[0][0];
    expect(rotated).toMatchObject({
      subjectId: 'customer-1',
      refreshToken: 'refresh-2',
    });
    expect(nextSession.familyId).toBe('family-1');
    expect(
      refreshSessionRepositoryWrite.revokeRefreshSessionById,
    ).toHaveBeenCalledWith('session-1', clock.now(), nextSession.id);
  });

  it('should revoke the whole family when a revoked token is reused', async () => {
    refreshSessionRepositoryRead.findRefreshSessionByTokenHash.mockResolvedValue(
      aSession({ revokedAt: clock.now() }),
    );

    await expect(
      authSessionService.rotateSession({
        refreshToken: 'refresh-1',
        subjectType: ESubjectType.CUSTOMER,
      }),
    ).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
    expect(
      refreshSessionRepositoryWrite.revokeRefreshSessionFamily,
    ).toHaveBeenCalledWith('family-1', clock.now());
    expect(
      refreshSessionRepositoryWrite.createRefreshSession,
    ).not.toHaveBeenCalled();
  });

  it('should treat a lost concurrent rotation as reuse', async () => {
    refreshSessionRepositoryRead.findRefreshSessionByTokenHash.mockResolvedValue(
      aSession(),
    );
    refreshSessionRepositoryWrite.revokeRefreshSessionById.mockResolvedValue(
      false,
    );

    await expect(
      authSessionService.rotateSession({
        refreshToken: 'refresh-1',
        subjectType: ESubjectType.CUSTOMER,
      }),
    ).rejects.toMatchObject({ code: 'SESSION_REVOKED' });
  });

  it('should throw SESSION_EXPIRED for an expired session', async () => {
    refreshSessionRepositoryRead.findRefreshSessionByTokenHash.mockResolvedValue(
      aSession({ expiresAt: clock.now() }),
    );

    await expect(
      authSessionService.rotateSession({
        refreshToken: 'refresh-1',
        subjectType: ESubjectType.CUSTOMER,
      }),
    ).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });
  });

  it('should reject a token of another subject type', async () => {
    refreshSessionRepositoryRead.findRefreshSessionByTokenHash.mockResolvedValue(
      aSession(),
    );

    await expect(
      authSessionService.rotateSession({
        refreshToken: 'refresh-1',
        subjectType: ESubjectType.STAFF,
      }),
    ).rejects.toThrow(UnauthorizedError);
  });
});

describe('When we revoke sessions', () => {
  it('should revoke the session of a known token', async () => {
    refreshSessionRepositoryRead.findRefreshSessionByTokenHash.mockResolvedValue(
      aSession(),
    );

    await authSessionService.revokeSession('refresh-1');

    expect(
      refreshSessionRepositoryWrite.revokeRefreshSessionById,
    ).toHaveBeenCalledWith('session-1', clock.now());
  });

  it('should ignore an unknown token', async () => {
    refreshSessionRepositoryRead.findRefreshSessionByTokenHash.mockResolvedValue(
      null,
    );

    await authSessionService.revokeSession('unknown');

    expect(
      refreshSessionRepositoryWrite.revokeRefreshSessionById,
    ).not.toHaveBeenCalled();
  });

  it('should revoke every session of a subject', async () => {
    await authSessionService.revokeAllSessionsForSubject(
      'staff-1',
      ESubjectType.STAFF,
    );

    expect(
      refreshSessionRepositoryWrite.revokeRefreshSessionsBySubject,
    ).toHaveBeenCalledWith('staff-1', ESubjectType.STAFF, clock.now());
  });
});
