import { randomUUID } from 'crypto';
import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { StaffUserServiceFactory } from '../../infrastructure/config/factories/staff-user.service.factory';
import { StoreServiceFactory } from '../../infrastructure/config/factories/store.service.factory';

export const STAFF_PASSWORD = 'secret123';

export async function createStaffUser(role = EStaffRole.STAFF) {
  const store = await StoreServiceFactory.create().ensureDefaultStore();
  return StaffUserServiceFactory.create().createStaffUser({
    storeId: store.id,
    name: `${role} user`,
    email: `${randomUUID()}@menu.dev`,
    password: STAFF_PASSWORD,
    role,
  });
}

export async function loginAs(role = EStaffRole.STAFF) {
  const staffUser = await createStaffUser(role);
  const response = await supertest(app.app)
    .post('/auth/staff/login')
    .send({ email: staffUser.email, password: STAFF_PASSWORD });

  return {
    staffUser,
    accessToken: response.body.accessToken as string,
    setCookie: response.headers['set-cookie'],
  };
}
