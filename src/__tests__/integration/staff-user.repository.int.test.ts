import { randomUUID } from 'crypto';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { MstaffUser } from '../../infrastructure/db/mongo/models/staff-user.model';
import { StaffUserRepositoryRead } from '../../infrastructure/repository/staff-user/staff-user.repository.read';
import { StaffUserRepositoryWrite } from '../../infrastructure/repository/staff-user/staff-user.repository.write';

const staffUserRepositoryRead = new StaffUserRepositoryRead();
const staffUserRepositoryWrite = new StaffUserRepositoryWrite();

function aStaffUser(email: string, role = EStaffRole.STAFF) {
  const now = new Date();
  return {
    id: randomUUID(),
    name: 'Robin',
    email,
    passwordHash: 'stored-hash',
    role,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}

beforeEach(async () => {
  await MstaffUser.deleteMany({});
  await MstaffUser.syncIndexes();
});

describe('When we persist staff users', () => {
  it('should never return the password hash from create or lookups', async () => {
    const created = await staffUserRepositoryWrite.createStaffUser(
      aStaffUser('robin@menu.dev'),
    );
    const found = await staffUserRepositoryRead.findStaffUserById(created.id);
    const listed = await staffUserRepositoryRead.listStaffUsers();

    expect(created).not.toHaveProperty('passwordHash');
    expect(created).not.toHaveProperty('_id');
    expect(found).not.toHaveProperty('passwordHash');
    expect(listed[0]).not.toHaveProperty('passwordHash');
  });

  it('should return the password hash only for the login lookup', async () => {
    await staffUserRepositoryWrite.createStaffUser(
      aStaffUser('robin@menu.dev'),
    );

    const found =
      await staffUserRepositoryRead.findStaffUserByEmailWithPassword(
        'robin@menu.dev',
      );

    expect(found?.passwordHash).toBe('stored-hash');
  });

  it('should reject a duplicated e-mail (STF-R01)', async () => {
    await staffUserRepositoryWrite.createStaffUser(
      aStaffUser('robin@menu.dev'),
    );

    await expect(
      staffUserRepositoryWrite.createStaffUser(aStaffUser('ROBIN@menu.dev')),
    ).rejects.toThrow(/duplicate key/);
  });

  it('should count only active owners', async () => {
    const owner = await staffUserRepositoryWrite.createStaffUser(
      aStaffUser('owner@menu.dev', EStaffRole.OWNER),
    );
    await staffUserRepositoryWrite.createStaffUser(
      aStaffUser('other-owner@menu.dev', EStaffRole.OWNER),
    );
    await staffUserRepositoryWrite.updateStaffUserById(owner.id, {
      isActive: false,
    });

    await expect(staffUserRepositoryRead.countActiveOwners()).resolves.toBe(1);
  });

  it('should replace the password hash', async () => {
    const created = await staffUserRepositoryWrite.createStaffUser(
      aStaffUser('robin@menu.dev'),
    );

    await staffUserRepositoryWrite.updateStaffUserPasswordHash(
      created.id,
      'new-hash',
    );

    const found = await staffUserRepositoryRead.findStaffUserByIdWithPassword(
      created.id,
    );
    expect(found?.passwordHash).toBe('new-hash');
  });
});
