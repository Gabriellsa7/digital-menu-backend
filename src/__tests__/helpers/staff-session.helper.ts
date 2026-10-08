import { randomUUID } from 'crypto';
import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { StaffUserServiceFactory } from '../../infrastructure/config/factories/staff-user.service.factory';
import { StoreServiceFactory } from '../../infrastructure/config/factories/store.service.factory';

export const STAFF_PASSWORD = 'secret123';

async function defaultStoreId(): Promise<string> {
  return (await StoreServiceFactory.create().ensureDefaultStore()).id;
}

export async function createStore(name = `Store ${randomUUID()}`) {
  return StoreServiceFactory.create().createStore({ name, isPublished: true });
}

export async function createStaffUser(
  role = EStaffRole.STAFF,
  storeId?: string,
) {
  return StaffUserServiceFactory.create().createStaffUser({
    storeId: storeId ?? (await defaultStoreId()),
    name: `${role} user`,
    email: `${randomUUID()}@menu.dev`,
    password: STAFF_PASSWORD,
    role,
  });
}

export async function loginAs(role = EStaffRole.STAFF, storeId?: string) {
  const staffUser = await createStaffUser(role, storeId);
  const response = await supertest(app.app)
    .post('/auth/staff/login')
    .send({ email: staffUser.email, password: STAFF_PASSWORD });

  return {
    staffUser,
    accessToken: response.body.accessToken as string,
    setCookie: response.headers['set-cookie'],
  };
}
