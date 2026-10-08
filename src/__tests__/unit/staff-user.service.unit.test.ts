import { StaffUserService } from '../../domain/staff-user/service/staff-user.service';
import { IStaffUserRepositoryRead } from '../../domain/staff-user/repository/staff-user.repository.read';
import { IStaffUserRepositoryWrite } from '../../domain/staff-user/repository/staff-user.repository.write';
import {
  EStaffRole,
  IStaffUserWithPassword,
} from '../../domain/staff-user/interfaces/staff-user.interface';
import { IPasswordHasher } from '../../domain/common/password-hasher.interface';
import { IAuthSessionService } from '../../domain/auth/interfaces/auth-session.service.interface';
import { ESubjectType } from '../../domain/auth/interfaces/auth-subject.interface';
import { BusinessRuleError } from '../../domain/errors/business-rule.error';
import { ConflictError } from '../../domain/errors/conflict.error';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error';
import { FixedClock } from '../helpers/fixed.clock';

const clock = new FixedClock();

function aStaffUser(
  overrides: Partial<IStaffUserWithPassword> = {},
): IStaffUserWithPassword {
  return {
    id: 'staff-1',
    name: 'Zoro',
    email: 'zoro@menu.dev',
    passwordHash: 'hash:secret123',
    role: EStaffRole.STAFF,
    isActive: true,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

let staffUserRepositoryRead: jest.Mocked<IStaffUserRepositoryRead>;
let staffUserRepositoryWrite: jest.Mocked<IStaffUserRepositoryWrite>;
let passwordHasher: jest.Mocked<IPasswordHasher>;
let authSessionService: jest.Mocked<IAuthSessionService>;
let staffUserService: StaffUserService;

beforeEach(() => {
  staffUserRepositoryRead = {
    findStaffUserById: jest.fn(),
    findStaffUserByIdWithPassword: jest.fn(),
    findStaffUserByEmail: jest.fn(),
    findStaffUserByEmailWithPassword: jest.fn(),
    listStaffUsers: jest.fn(),
    countActiveOwners: jest.fn(),
  };
  staffUserRepositoryWrite = {
    createStaffUser: jest.fn(async ({ passwordHash, ...user }) => user),
    updateStaffUserById: jest.fn(async (id, fields) => ({
      ...aStaffUser({ id }),
      ...fields,
    })),
    updateStaffUserPasswordHash: jest.fn().mockResolvedValue(true),
  };
  passwordHasher = {
    hashPassword: jest.fn(async (password) => `hash:${password}`),
    isPasswordMatch: jest.fn(
      async (password, passwordHash) => passwordHash === `hash:${password}`,
    ),
  };
  authSessionService = {
    startSession: jest.fn(),
    rotateSession: jest.fn(),
    createAccessToken: jest.fn(),
    revokeSession: jest.fn(),
    revokeAllSessionsForSubject: jest.fn(),
  };
  staffUserService = new StaffUserService({
    staffUserRepositoryRead,
    staffUserRepositoryWrite,
    passwordHasher,
    authSessionService,
    clock,
  });
});

describe('When we create a staff user', () => {
  const NEW_USER = {
    name: ' Sanji ',
    email: ' Sanji@Menu.DEV ',
    password: 'cook1234',
    role: EStaffRole.STAFF,
  };

  it('should store a lowercase e-mail and a hashed password', async () => {
    staffUserRepositoryRead.findStaffUserByEmail.mockResolvedValue(null);

    const created = await staffUserService.createStaffUser(NEW_USER);

    expect(created).toMatchObject({
      name: 'Sanji',
      email: 'sanji@menu.dev',
      isActive: true,
    });
    expect(staffUserRepositoryWrite.createStaffUser).toHaveBeenCalledWith(
      expect.objectContaining({ passwordHash: 'hash:cook1234' }),
    );
  });

  it('should throw ConflictError when the e-mail is taken (STF-R01)', async () => {
    staffUserRepositoryRead.findStaffUserByEmail.mockResolvedValue(
      aStaffUser(),
    );

    await expect(staffUserService.createStaffUser(NEW_USER)).rejects.toThrow(
      ConflictError,
    );
  });

  it.each(['short1', 'onlyletters', '12345678'])(
    'should reject the weak password "%s" (STF-R02)',
    async (password) => {
      await expect(
        staffUserService.createStaffUser({ ...NEW_USER, password }),
      ).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
    },
  );
});

describe('When we get a staff user by ID', () => {
  it('should throw NotFoundError when it does not exist', async () => {
    staffUserRepositoryRead.findStaffUserById.mockResolvedValue(null);

    await expect(staffUserService.getStaffUserById('missing')).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('When we update a staff user', () => {
  it('should not demote the last active owner (STF-R04)', async () => {
    staffUserRepositoryRead.findStaffUserById.mockResolvedValue(
      aStaffUser({ role: EStaffRole.OWNER }),
    );
    staffUserRepositoryRead.countActiveOwners.mockResolvedValue(1);

    await expect(
      staffUserService.updateStaffUser({
        id: 'staff-1',
        role: EStaffRole.STAFF,
      }),
    ).rejects.toMatchObject({ code: 'LAST_OWNER' });
  });

  it('should demote an owner when another active owner exists', async () => {
    staffUserRepositoryRead.findStaffUserById.mockResolvedValue(
      aStaffUser({ role: EStaffRole.OWNER }),
    );
    staffUserRepositoryRead.countActiveOwners.mockResolvedValue(2);

    const updated = await staffUserService.updateStaffUser({
      id: 'staff-1',
      name: 'Nami',
      role: EStaffRole.STAFF,
    });

    expect(updated).toMatchObject({ name: 'Nami', role: EStaffRole.STAFF });
  });
});

describe('When we activate or deactivate a staff user', () => {
  it('should not deactivate the last active owner (STF-R04)', async () => {
    staffUserRepositoryRead.findStaffUserById.mockResolvedValue(
      aStaffUser({ role: EStaffRole.OWNER }),
    );
    staffUserRepositoryRead.countActiveOwners.mockResolvedValue(1);

    await expect(
      staffUserService.setStaffUserActive({ id: 'staff-1', isActive: false }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it('should revoke every session of a deactivated user (STF-R05)', async () => {
    staffUserRepositoryRead.findStaffUserById.mockResolvedValue(aStaffUser());

    const updated = await staffUserService.setStaffUserActive({
      id: 'staff-1',
      isActive: false,
    });

    expect(updated.isActive).toBe(false);
    expect(authSessionService.revokeAllSessionsForSubject).toHaveBeenCalledWith(
      'staff-1',
      ESubjectType.STAFF,
    );
  });

  it('should do nothing when the status does not change', async () => {
    staffUserRepositoryRead.findStaffUserById.mockResolvedValue(aStaffUser());

    await staffUserService.setStaffUserActive({
      id: 'staff-1',
      isActive: true,
    });

    expect(staffUserRepositoryWrite.updateStaffUserById).not.toHaveBeenCalled();
  });
});

describe('When a staff user changes the password', () => {
  it('should save the new hash when the current password matches', async () => {
    staffUserRepositoryRead.findStaffUserByIdWithPassword.mockResolvedValue(
      aStaffUser(),
    );

    await staffUserService.changeStaffUserPassword({
      id: 'staff-1',
      currentPassword: 'secret123',
      newPassword: 'newSecret9',
    });

    expect(
      staffUserRepositoryWrite.updateStaffUserPasswordHash,
    ).toHaveBeenCalledWith('staff-1', 'hash:newSecret9');
  });

  it('should reject a wrong current password', async () => {
    staffUserRepositoryRead.findStaffUserByIdWithPassword.mockResolvedValue(
      aStaffUser(),
    );

    await expect(
      staffUserService.changeStaffUserPassword({
        id: 'staff-1',
        currentPassword: 'wrong1234',
        newPassword: 'newSecret9',
      }),
    ).rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' });
  });

  it('should reject a weak new password (STF-R02)', async () => {
    staffUserRepositoryRead.findStaffUserByIdWithPassword.mockResolvedValue(
      aStaffUser(),
    );

    await expect(
      staffUserService.changeStaffUserPassword({
        id: 'staff-1',
        currentPassword: 'secret123',
        newPassword: 'weak',
      }),
    ).rejects.toMatchObject({ code: 'WEAK_PASSWORD' });
  });

  it('should throw NotFoundError for an unknown user', async () => {
    staffUserRepositoryRead.findStaffUserByIdWithPassword.mockResolvedValue(
      null,
    );

    await expect(
      staffUserService.changeStaffUserPassword({
        id: 'missing',
        currentPassword: 'secret123',
        newPassword: 'newSecret9',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('When we verify staff credentials', () => {
  it('should return the user and touch lastLoginAt', async () => {
    staffUserRepositoryRead.findStaffUserByEmailWithPassword.mockResolvedValue(
      aStaffUser(),
    );

    const staffUser = await staffUserService.verifyStaffUserCredentials({
      email: 'ZORO@menu.dev',
      password: 'secret123',
    });

    expect(staffUser.lastLoginAt).toEqual(clock.now());
    expect(
      staffUserRepositoryRead.findStaffUserByEmailWithPassword,
    ).toHaveBeenCalledWith('zoro@menu.dev');
  });

  it.each([
    ['an unknown e-mail', null],
    ['a wrong password', aStaffUser({ passwordHash: 'hash:other' })],
  ])(
    'should throw the same UnauthorizedError for %s (AUTH-R01)',
    async (_case, staffUser) => {
      staffUserRepositoryRead.findStaffUserByEmailWithPassword.mockResolvedValue(
        staffUser,
      );

      await expect(
        staffUserService.verifyStaffUserCredentials({
          email: 'zoro@menu.dev',
          password: 'secret123',
        }),
      ).rejects.toMatchObject({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS',
      });
    },
  );

  it('should reject an inactive user (AUTH-R02)', async () => {
    staffUserRepositoryRead.findStaffUserByEmailWithPassword.mockResolvedValue(
      aStaffUser({ isActive: false }),
    );

    await expect(
      staffUserService.verifyStaffUserCredentials({
        email: 'zoro@menu.dev',
        password: 'secret123',
      }),
    ).rejects.toThrow(UnauthorizedError);
  });
});

describe('When we check whether an owner exists', () => {
  it('should be true when there is an active owner', async () => {
    staffUserRepositoryRead.countActiveOwners.mockResolvedValue(1);

    await expect(staffUserService.hasOwner()).resolves.toBe(true);
  });
});
