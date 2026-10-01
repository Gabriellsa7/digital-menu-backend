import { randomUUID } from 'crypto';
import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { Mcustomer } from '../../infrastructure/db/mongo/models/customer.model';
import { fakeGoogleIdToken } from '../helpers/fake.google-identity.verifier';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';

function googleProfile() {
  const sub = randomUUID();
  return { sub, email: `${sub}@gmail.com`, name: 'Monkey D. Luffy' };
}

describe('When a customer logs in with Google', () => {
  it('should create the account prefilled from the Google profile', async () => {
    const profile = googleProfile();

    const { body, statusCode } = await supertest(app.app)
      .post('/auth/customer/google')
      .send({ idToken: fakeGoogleIdToken(profile) });

    expect(statusCode).toBe(200);
    expect(body.isNew).toBe(true);
    expect(body.customer).toMatchObject({
      name: profile.name,
      email: profile.email,
      isGoogleLinked: true,
      isPhoneVerified: false,
    });
    expect(body.customer.phone).toBeUndefined();

    // Absent, not null: keeps the sparse/partial unique indexes working
    const customerInDb = await Mcustomer.findOne({ id: body.customer.id })
      .lean()
      .exec();
    expect(customerInDb).not.toHaveProperty('phone');
    expect(customerInDb).not.toHaveProperty('phoneVerifiedAt');
  });

  it('should return the same account on the next login', async () => {
    const profile = googleProfile();
    const first = await supertest(app.app)
      .post('/auth/customer/google')
      .send({ idToken: fakeGoogleIdToken(profile) });

    const second = await supertest(app.app)
      .post('/auth/customer/google')
      .send({ idToken: fakeGoogleIdToken(profile) });

    expect(second.body.isNew).toBe(false);
    expect(second.body.customer.id).toBe(first.body.customer.id);
  });

  it('should return 401 GOOGLE_TOKEN_INVALID for an invalid token', async () => {
    const { body, statusCode } = await supertest(app.app)
      .post('/auth/customer/google')
      .send({ idToken: 'not-a-google-token' });

    expect(statusCode).toBe(401);
    expect(body.code).toBe('GOOGLE_TOKEN_INVALID');
  });
});

describe('When a customer links a Google account', () => {
  it('should let an SMS account log in with Google afterwards', async () => {
    const { accessToken, customerId } = await loginCustomerWithOtp();
    const profile = googleProfile();

    const link = await supertest(app.app)
      .post('/me/identities/google')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ idToken: fakeGoogleIdToken(profile) });
    const googleLogin = await supertest(app.app)
      .post('/auth/customer/google')
      .send({ idToken: fakeGoogleIdToken(profile) });

    expect(link.statusCode).toBe(200);
    expect(link.body).toMatchObject({
      isGoogleLinked: true,
      email: profile.email,
    });
    expect(googleLogin.body.customer.id).toBe(customerId);
  });

  it('should return 409 GOOGLE_ACCOUNT_IN_USE when another customer owns it', async () => {
    const profile = googleProfile();
    await supertest(app.app)
      .post('/auth/customer/google')
      .send({ idToken: fakeGoogleIdToken(profile) });
    const { accessToken } = await loginCustomerWithOtp();

    const { body, statusCode } = await supertest(app.app)
      .post('/me/identities/google')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ idToken: fakeGoogleIdToken(profile) });

    expect(statusCode).toBe(409);
    expect(body.code).toBe('GOOGLE_ACCOUNT_IN_USE');
  });
});
