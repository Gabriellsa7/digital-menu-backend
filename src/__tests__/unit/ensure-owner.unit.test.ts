import { ensureOwner } from '../../infrastructure/bootstrap/ensure-owner';
import { IStaffUserService } from '../../domain/staff-user/interfaces/staff-user.service.interface';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';

function aStaffUserService(hasOwner: boolean) {
  return {
    hasOwner: jest.fn().mockResolvedValue(hasOwner),
    createStaffUser: jest.fn(),
  } as unknown as jest.Mocked<IStaffUserService>;
}

describe('When the API boots', () => {
  it('should create the first owner from the bootstrap settings', async () => {
    const staffUserService = aStaffUserService(false);

    await ensureOwner({
      staffUserService,
      name: 'Owner',
      email: 'owner@menu.dev',
      password: 'owner1234',
    });

    expect(staffUserService.createStaffUser).toHaveBeenCalledWith({
      name: 'Owner',
      email: 'owner@menu.dev',
      password: 'owner1234',
      role: EStaffRole.OWNER,
    });
  });

  it.each([
    ['an owner already exists', true, 'owner@menu.dev'],
    ['the bootstrap settings are missing', false, undefined],
  ])('should not create an owner when %s', async (_case, hasOwner, email) => {
    const staffUserService = aStaffUserService(hasOwner);

    await ensureOwner({
      staffUserService,
      name: 'Owner',
      email,
      password: 'owner1234',
    });

    expect(staffUserService.createStaffUser).not.toHaveBeenCalled();
  });
});
