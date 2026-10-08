import { Logger } from 'traceability';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { IStaffUserService } from '../../domain/staff-user/interfaces/staff-user.service.interface';

export interface IParamsEnsureOwner {
  staffUserService: IStaffUserService;
  name: string;
  email?: string;
  password?: string;
}

export async function ensureOwner({
  staffUserService,
  name,
  email,
  password,
}: IParamsEnsureOwner): Promise<void> {
  if (await staffUserService.hasOwner()) {
    return;
  }
  if (!email || !password) {
    Logger.warn('No owner exists and BOOTSTRAP_OWNER_* is not set', {
      eventName: 'bootstrap.owner_missing',
    });
    return;
  }
  await staffUserService.createStaffUser({
    name,
    email,
    password,
    role: EStaffRole.OWNER,
  });
  Logger.info('Bootstrap owner created', {
    eventName: 'bootstrap.owner_created',
  });
}
