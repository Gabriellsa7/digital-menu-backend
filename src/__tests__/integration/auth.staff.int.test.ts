import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { StaffUserServiceFactory } from '../../infrastructure/config/factories/staff-user.service.factory';
import { randomUUID } from 'crypto';
import { Mstore } from '../../infrastructure/db/mongo/models/store.model';
import { findCookie } from '../helpers/customer-session.helper';
import { as } from '../helpers/http.helper';
import {
  STAFF_PASSWORD,
  createStaffUser,
  loginAs,
} from '../helpers/staff-session.helper';

const REFRESH_COOKIE = 'dm_rt_staff';

function refresh(cookie?: string) {
  const request = supertest(app.app).post('/auth/staff/refresh');
  return cookie ? request.set('Cookie', cookie) : request;
}

describe('When a staff user logs in', () => {
  it('should return an access token, the user and a refresh cookie', async () => {
    const staffUser = await createStaffUser(EStaffRole.OWNER);

    const response = await supertest(app.app)
      .post('/auth/staff/login')
      .send({ email: staffUser.email.toUpperCase(), password: STAFF_PASSWORD });

    expect(response.statusCode).toBe(200);
    expect(response.body.staffUser).toMatchObject({
      id: staffUser.id,
      role: EStaffRole.OWNER,
    });
    expect(response.body.staffUser).not.toHaveProperty('passwordHash');
    expect(
      findCookie(response.headers['set-cookie'], REFRESH_COOKIE),
    ).toBeDefined();
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
  });

  it('should answer 401 with the same message for a wrong password (AUTH-R01)', async () => {
    const staffUser = await createStaffUser();

    const wrongPassword = await supertest(app.app)
      .post('/auth/staff/login')
      .send({ email: staffUser.email, password: 'wrong-password1' });
    const unknownEmail = await supertest(app.app)
      .post('/auth/staff/login')
      .send({ email: 'nobody@menu.dev', password: STAFF_PASSWORD });

    expect(wrongPassword.statusCode).toBe(401);
    expect(unknownEmail.statusCode).toBe(401);
    expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
  });

  it('should answer 401 for an inactive user (AUTH-R02)', async () => {
    const staffUser = await createStaffUser();
    await StaffUserServiceFactory.create().setStaffUserActive({
      storeId: staffUser.storeId,
      id: staffUser.id,
      isActive: false,
    });

    const response = await supertest(app.app)
      .post('/auth/staff/login')
      .send({ email: staffUser.email, password: STAFF_PASSWORD });

    expect(response.statusCode).toBe(401);
    expect(response.body.code).toBe('USER_INACTIVE');
  });
});

describe('When a staff user refreshes the session', () => {
  it('should rotate the cookie and reject the reused one (AUTH-R04)', async () => {
    const { setCookie } = await loginAs();
    const firstCookie = findCookie(setCookie, REFRESH_COOKIE);

    const rotated = await refresh(firstCookie);
    const reused = await refresh(firstCookie);
    const afterTheft = await refresh(
      findCookie(rotated.headers['set-cookie'], REFRESH_COOKIE),
    );

    expect(rotated.statusCode).toBe(200);
    expect(rotated.body.accessToken).toEqual(expect.any(String));
    expect(reused.statusCode).toBe(401);
    expect(afterTheft.statusCode).toBe(401);
  });

  it('should answer 401 without a cookie', async () => {
    const response = await refresh();

    expect(response.statusCode).toBe(401);
    expect(response.body.code).toBe('SESSION_MISSING');
  });

  it('should not refresh a deactivated user (STF-R05)', async () => {
    const { setCookie, staffUser } = await loginAs();
    await StaffUserServiceFactory.create().setStaffUserActive({
      storeId: staffUser.storeId,
      id: staffUser.id,
      isActive: false,
    });

    const response = await refresh(findCookie(setCookie, REFRESH_COOKIE));

    expect(response.statusCode).toBe(401);
  });
});

describe('When a staff user logs out', () => {
  it('should revoke the session (AUTH-R05)', async () => {
    const { setCookie } = await loginAs();
    const cookie = findCookie(setCookie, REFRESH_COOKIE)!;

    const logout = await supertest(app.app)
      .post('/auth/staff/logout')
      .set('Cookie', cookie);
    const response = await refresh(cookie);

    expect(logout.statusCode).toBe(204);
    expect(response.statusCode).toBe(401);
  });
});

describe('When an owner signs up a new store (TEN-R07)', () => {
  const SIGNUP = {
    storeName: 'Casa Brasa',
    ownerName: 'Nami',
    password: 'secret123',
  };

  it('should create an unpublished store and log the owner in', async () => {
    const email = `${randomUUID()}@menu.dev`;

    const { body, statusCode, headers } = await supertest(app.app)
      .post('/auth/staff/signup')
      .send({ ...SIGNUP, email });
    const store = await as(body.accessToken).get('/admin/store');

    expect(statusCode).toBe(201);
    expect(headers['set-cookie']).toEqual(
      expect.arrayContaining([expect.stringContaining('dm_rt_staff=')]),
    );
    expect(body.staffUser).toMatchObject({ role: 'OWNER', email });
    expect(store.body).toMatchObject({
      id: body.staffUser.storeId,
      name: 'Casa Brasa',
      isPublished: false,
    });
  });

  it('should not leave a store behind when the e-mail is taken', async () => {
    const existing = await createStaffUser(EStaffRole.OWNER);
    const storesBefore = await Mstore.countDocuments();

    const { statusCode } = await supertest(app.app)
      .post('/auth/staff/signup')
      .send({ ...SIGNUP, email: existing.email });

    expect(statusCode).toBe(409);
    await expect(Mstore.countDocuments()).resolves.toBe(storesBefore);
  });
});
