import { randomUUID } from 'crypto';
import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { MstaffUser } from '../../infrastructure/db/mongo/models/staff-user.model';
import {
  findCookie,
  loginCustomerWithOtp,
} from '../helpers/customer-session.helper';
import { as } from '../helpers/http.helper';
import { STAFF_PASSWORD, loginAs } from '../helpers/staff-session.helper';

function aNewStaffUser() {
  return {
    name: 'Usopp',
    email: `${randomUUID()}@menu.dev`,
    password: 'sniper123',
    role: EStaffRole.STAFF,
  };
}

beforeEach(async () => {
  await MstaffUser.deleteMany({});
});

describe('When a staff user reads the own profile', () => {
  it('should return the profile without the password hash', async () => {
    const { accessToken, staffUser } = await loginAs(EStaffRole.STAFF);

    const { body, statusCode } = await as(accessToken).get('/admin/me');

    expect(statusCode).toBe(200);
    expect(body.id).toBe(staffUser.id);
    expect(body).not.toHaveProperty('passwordHash');
  });

  it('should answer 401 without a token and 403 for a customer', async () => {
    const { accessToken } = await loginCustomerWithOtp();

    const anonymous = await supertest(app.app).get('/admin/me');
    const customer = await as(accessToken).get('/admin/me');

    expect(anonymous.statusCode).toBe(401);
    expect(customer.statusCode).toBe(403);
  });
});

describe('When a staff user changes the own password', () => {
  it('should log in with the new password afterwards', async () => {
    const { accessToken, staffUser } = await loginAs();

    const change = await as(accessToken)
      .patch('/admin/me/password')
      .send({ currentPassword: STAFF_PASSWORD, newPassword: 'brandNew42' });
    const login = await supertest(app.app)
      .post('/auth/staff/login')
      .send({ email: staffUser.email, password: 'brandNew42' });

    expect(change.statusCode).toBe(204);
    expect(login.statusCode).toBe(200);
  });

  it('should answer 400 for a weak new password (STF-R02)', async () => {
    const { accessToken } = await loginAs();

    const { statusCode } = await as(accessToken)
      .patch('/admin/me/password')
      .send({ currentPassword: STAFF_PASSWORD, newPassword: 'weakpass' });

    expect(statusCode).toBe(400);
  });
});

describe('When the owner manages the team', () => {
  it('should create and list staff users', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);

    const created = await as(accessToken)
      .post('/admin/staff-users')
      .send(aNewStaffUser());
    const listed = await as(accessToken).get('/admin/staff-users');

    expect(created.statusCode).toBe(201);
    expect(created.body).not.toHaveProperty('passwordHash');
    expect(listed.body).toHaveLength(2);
  });

  it('should answer 409 for a duplicated e-mail (STF-R01)', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);
    const newStaffUser = aNewStaffUser();
    await as(accessToken).post('/admin/staff-users').send(newStaffUser);

    const { statusCode } = await as(accessToken)
      .post('/admin/staff-users')
      .send({ ...newStaffUser, email: newStaffUser.email.toUpperCase() });

    expect(statusCode).toBe(409);
  });

  it('should answer 403 to a STAFF user (STF-R03)', async () => {
    const { accessToken } = await loginAs(EStaffRole.STAFF);

    const list = await as(accessToken).get('/admin/staff-users');
    const create = await as(accessToken)
      .post('/admin/staff-users')
      .send(aNewStaffUser());

    expect(list.statusCode).toBe(403);
    expect(create.statusCode).toBe(403);
  });

  it('should not demote or deactivate the last owner (STF-R04)', async () => {
    const { accessToken, staffUser } = await loginAs(EStaffRole.OWNER);

    const demote = await as(accessToken)
      .put(`/admin/staff-users/${staffUser.id}`)
      .send({ role: EStaffRole.STAFF });
    const deactivate = await as(accessToken)
      .patch(`/admin/staff-users/${staffUser.id}/active`)
      .send({ isActive: false });

    expect(demote.statusCode).toBe(422);
    expect(demote.body.code).toBe('LAST_OWNER');
    expect(deactivate.body.code).toBe('LAST_OWNER');
  });

  it('should revoke the sessions of a deactivated user (STF-R05)', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);
    const member = await loginAs(EStaffRole.STAFF);

    const deactivate = await as(accessToken)
      .patch(`/admin/staff-users/${member.staffUser.id}/active`)
      .send({ isActive: false });
    const refresh = await supertest(app.app)
      .post('/auth/staff/refresh')
      .set('Cookie', findCookie(member.setCookie, 'dm_rt_staff')!);

    expect(deactivate.statusCode).toBe(200);
    expect(deactivate.body.isActive).toBe(false);
    expect(refresh.statusCode).toBe(401);
  });

  it('should answer 404 for an unknown staff user', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);

    const { statusCode } = await as(accessToken)
      .put('/admin/staff-users/unknown')
      .send({ name: 'Brook' });

    expect(statusCode).toBe(404);
  });
});
