import { StaffAuthService } from '../../domain/auth/service/staff-auth.service';
import { ConflictError } from '../../domain/errors/conflict.error';
import { IStoreService } from '../../domain/store/interfaces/store.service.interface';
import { IAuthSessionService } from '../../domain/auth/interfaces/auth-session.service.interface';
import { ESubjectType } from '../../domain/auth/interfaces/auth-subject.interface';
import { IStaffUserService } from '../../domain/staff-user/interfaces/staff-user.service.interface';
import {
  EStaffRole,
  IStaffUser,
} from '../../domain/staff-user/interfaces/staff-user.interface';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { FixedClock } from '../helpers/fixed.clock';

const clock = new FixedClock();
const TOKENS = {
  accessToken: 'access',
  accessTokenExpiresInSeconds: 900,
  refreshToken: 'refresh',
  refreshTokenExpiresAt: clock.now(),
};

function aStaffUser(overrides: Partial<IStaffUser> = {}): IStaffUser {
  return {
    id: 'staff-1',
    storeId: 'store-1',
    name: 'Nami',
    email: 'nami@menu.dev',
    role: EStaffRole.OWNER,
    isActive: true,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

let staffUserService: jest.Mocked<
  Pick<
    IStaffUserService,
    'verifyStaffUserCredentials' | 'getStaffUserById' | 'createStaffUser'
  >
>;
let storeService: jest.Mocked<
  Pick<IStoreService, 'createStore' | 'deleteStore'>
>;
let authSessionService: jest.Mocked<IAuthSessionService>;
let staffAuthService: StaffAuthService;

beforeEach(() => {
  staffUserService = {
    verifyStaffUserCredentials: jest.fn().mockResolvedValue(aStaffUser()),
    getStaffUserById: jest.fn().mockResolvedValue(aStaffUser()),
    createStaffUser: jest.fn().mockResolvedValue(aStaffUser()),
  };
  storeService = {
    createStore: jest
      .fn()
      .mockResolvedValue({ id: 'store-1', slug: 'casa-brasa' }),
    deleteStore: jest.fn(),
  };
  authSessionService = {
    startSession: jest.fn().mockResolvedValue(TOKENS),
    rotateSession: jest.fn().mockResolvedValue({
      subjectId: 'staff-1',
      refreshToken: 'refresh-2',
      refreshTokenExpiresAt: clock.now(),
    }),
    createAccessToken: jest
      .fn()
      .mockReturnValue({ accessToken: 'access-2', expiresInSeconds: 900 }),
    revokeSession: jest.fn(),
    revokeAllSessionsForSubject: jest.fn(),
  };
  staffAuthService = new StaffAuthService({
    staffUserService: staffUserService as unknown as IStaffUserService,
    storeService: storeService as unknown as IStoreService,
    authSessionService,
  });
});

describe('When a staff user logs in', () => {
  it('should start a session carrying the role', async () => {
    const result = await staffAuthService.login({
      email: 'nami@menu.dev',
      password: 'secret123',
    });

    expect(result.tokens).toBe(TOKENS);
    expect(authSessionService.startSession).toHaveBeenCalledWith({
      subject: {
        subjectId: 'staff-1',
        subjectType: ESubjectType.STAFF,
        role: EStaffRole.OWNER,
        storeId: 'store-1',
      },
      userAgent: undefined,
    });
  });
});

describe('When an owner signs up a new store (TEN-R07)', () => {
  const SIGNUP = {
    storeName: 'Casa Brasa',
    ownerName: 'Nami',
    email: 'nami@menu.dev',
    password: 'secret123',
  };

  it('should create the store, its owner, and a session', async () => {
    const result = await staffAuthService.signup(SIGNUP);

    expect(storeService.createStore).toHaveBeenCalledWith({
      name: 'Casa Brasa',
    });
    expect(staffUserService.createStaffUser).toHaveBeenCalledWith({
      storeId: 'store-1',
      name: 'Nami',
      email: 'nami@menu.dev',
      password: 'secret123',
      role: EStaffRole.OWNER,
    });
    expect(result.tokens).toBe(TOKENS);
  });

  it('should delete the store when the owner cannot be created', async () => {
    staffUserService.createStaffUser.mockRejectedValue(
      new ConflictError('E-mail is already in use', 'EMAIL_ALREADY_IN_USE'),
    );

    await expect(staffAuthService.signup(SIGNUP)).rejects.toMatchObject({
      code: 'EMAIL_ALREADY_IN_USE',
    });
    expect(storeService.deleteStore).toHaveBeenCalledWith('store-1');
    expect(authSessionService.startSession).not.toHaveBeenCalled();
  });
});

describe('When a staff user refreshes the session', () => {
  it('should rotate the session and sign a token with the current role', async () => {
    staffUserService.getStaffUserById.mockResolvedValue(
      aStaffUser({ role: EStaffRole.STAFF }),
    );

    const tokens = await staffAuthService.refreshSession({
      refreshToken: 'refresh',
    });

    expect(tokens).toMatchObject({
      accessToken: 'access-2',
      refreshToken: 'refresh-2',
    });
    expect(authSessionService.createAccessToken).toHaveBeenCalledWith({
      subjectId: 'staff-1',
      subjectType: ESubjectType.STAFF,
      role: EStaffRole.STAFF,
      storeId: 'store-1',
    });
  });

  it('should reject an inactive user and revoke the sessions (AUTH-R02)', async () => {
    staffUserService.getStaffUserById.mockResolvedValue(
      aStaffUser({ isActive: false }),
    );

    await expect(
      staffAuthService.refreshSession({ refreshToken: 'refresh' }),
    ).rejects.toMatchObject({ code: 'USER_INACTIVE' });
    expect(authSessionService.revokeAllSessionsForSubject).toHaveBeenCalled();
  });

  it('should reject a session of a deleted user', async () => {
    staffUserService.getStaffUserById.mockRejectedValue(new NotFoundError());

    await expect(
      staffAuthService.refreshSession({ refreshToken: 'refresh' }),
    ).rejects.toMatchObject({ code: 'SESSION_INVALID' });
  });
});

describe('When a staff user logs out', () => {
  it('should revoke the current session (AUTH-R05)', async () => {
    await staffAuthService.logout('refresh');

    expect(authSessionService.revokeSession).toHaveBeenCalledWith('refresh');
  });

  it('should do nothing without a refresh token', async () => {
    await staffAuthService.logout();

    expect(authSessionService.revokeSession).not.toHaveBeenCalled();
  });
});
