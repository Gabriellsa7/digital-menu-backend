import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { ESubjectType } from '../../domain/auth/interfaces/auth-subject.interface';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { TokenServiceFactory } from '../../infrastructure/config/factories/token.service.factory';
import { fakeGoogleIdToken } from '../helpers/fake.google-identity.verifier';
import {
  loginCustomerWithOtp,
  randomBrazilianMobile,
} from '../helpers/customer-session.helper';

async function loginWithGoogle() {
  const sub = `google-${Date.now()}-${Math.random()}`;
  const { body } = await supertest(app.app)
    .post('/auth/customer/google')
    .send({
      idToken: fakeGoogleIdToken({ sub, email: 'nami@gmail.com' }),
    });
  return body.accessToken as string;
}

describe('When we access /me without a valid customer token', () => {
  it('should return 401 without the Authorization header', async () => {
    const { body, statusCode } = await supertest(app.app).get('/me');

    expect(statusCode).toBe(401);
    expect(body.status).toBe(401);
  });

  it('should return 401 TOKEN_INVALID for a tampered token', async () => {
    const { body, statusCode } = await supertest(app.app)
      .get('/me')
      .set('Authorization', 'Bearer not.a.jwt');

    expect(statusCode).toBe(401);
    expect(body.code).toBe('TOKEN_INVALID');
  });

  it('should return 403 for a staff token', async () => {
    const { accessToken } = TokenServiceFactory.create().signAccessToken({
      sub: 'staff-1',
      typ: ESubjectType.STAFF,
      role: EStaffRole.OWNER,
    });

    const { statusCode } = await supertest(app.app)
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(statusCode).toBe(403);
  });
});

describe('When the customer reads their profile', () => {
  it('should return the profile without internal fields', async () => {
    const { accessToken, customerId, phone } = await loginCustomerWithOtp();

    const { body, statusCode } = await supertest(app.app)
      .get('/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({ id: customerId, phone });
    expect(body._id).toBeUndefined();
    expect(body.phoneVerifiedAt).toBeUndefined();
  });
});

describe('When the customer updates their profile', () => {
  it('should update the name', async () => {
    const { accessToken } = await loginCustomerWithOtp();

    const { body, statusCode } = await supertest(app.app)
      .patch('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: '  Roronoa Zoro  ' });

    expect(statusCode).toBe(200);
    expect(body.name).toBe('Roronoa Zoro');
  });

  it('should save a normalized contact phone for a Google account', async () => {
    const accessToken = await loginWithGoogle();
    const phone = randomBrazilianMobile();

    const { body, statusCode } = await supertest(app.app)
      .patch('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: `+55 (${phone.slice(3, 5)}) ${phone.slice(5)}` });

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({ phone, isPhoneVerified: false });
  });

  it('should remove the contact phone when it is sent as null', async () => {
    const accessToken = await loginWithGoogle();
    await supertest(app.app)
      .patch('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: randomBrazilianMobile() });

    const { body, statusCode } = await supertest(app.app)
      .patch('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: null });

    expect(statusCode).toBe(200);
    expect(body.phone).toBeUndefined();
  });

  it('should return 422 PHONE_IS_ONLY_LOGIN when an SMS-only account changes its phone', async () => {
    const { accessToken } = await loginCustomerWithOtp();

    const { body, statusCode } = await supertest(app.app)
      .patch('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ phone: randomBrazilianMobile() });

    expect(statusCode).toBe(422);
    expect(body.code).toBe('PHONE_IS_ONLY_LOGIN');
  });

  it('should return 400 for unknown fields', async () => {
    const { accessToken } = await loginCustomerWithOtp();

    const { statusCode } = await supertest(app.app)
      .patch('/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ googleSub: 'hijack' });

    expect(statusCode).toBe(400);
  });
});
