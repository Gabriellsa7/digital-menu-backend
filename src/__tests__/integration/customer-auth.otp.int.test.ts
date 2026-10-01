import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { smsProvider } from '../configApp';
import {
  CUSTOMER_REFRESH_COOKIE,
  CUSTOMER_SESSION_HINT_COOKIE,
} from '../../interfaces/http/cookies/customer-session.cookie';
import { Mcustomer } from '../../infrastructure/db/mongo/models/customer.model';
import { Motp } from '../../infrastructure/db/mongo/models/otp.model';
import {
  findCookie,
  loginCustomerWithOtp,
  randomBrazilianMobile,
} from '../helpers/customer-session.helper';

describe('When we request an SMS code', () => {
  it('should send a simulated SMS and expose the code in demo mode', async () => {
    const phone = randomBrazilianMobile();

    const { body, statusCode } = await supertest(app.app)
      .post('/auth/customer/otp/request')
      .send({ phone: `(11) ${phone.slice(5, 10)}-${phone.slice(10)}` });

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      phone,
      expiresInSeconds: 300,
      retryAfterSeconds: 60,
    });
    expect(body.debugCode).toMatch(/^\d{6}$/);
    expect(smsProvider.sentMessages.at(-1)).toMatchObject({ to: phone });

    const otpInDb = await Motp.findOne({ phone });
    expect(otpInDb?.codeHash).toBeDefined();
    expect(otpInDb?.codeHash).not.toContain(body.debugCode);
  });

  it('should return 422 INVALID_PHONE for a landline number', async () => {
    const { body, statusCode } = await supertest(app.app)
      .post('/auth/customer/otp/request')
      .send({ phone: '(11) 3333-4444' });

    expect(statusCode).toBe(422);
    expect(body).toMatchObject({ status: 422, code: 'INVALID_PHONE' });
  });

  it('should return 429 with Retry-After when asked again too soon', async () => {
    const phone = randomBrazilianMobile();
    await supertest(app.app).post('/auth/customer/otp/request').send({ phone });

    const { body, statusCode, headers } = await supertest(app.app)
      .post('/auth/customer/otp/request')
      .send({ phone });

    expect(statusCode).toBe(429);
    expect(body.code).toBe('OTP_TOO_SOON');
    expect(Number(headers['retry-after'])).toBeGreaterThan(0);
  });
});

describe('When we verify an SMS code', () => {
  it('should sign the customer up on the first login and set the session cookies', async () => {
    const phone = randomBrazilianMobile();
    const { body: requestBody } = await supertest(app.app)
      .post('/auth/customer/otp/request')
      .send({ phone });

    const { body, statusCode, headers } = await supertest(app.app)
      .post('/auth/customer/otp/verify')
      .send({ phone, code: requestBody.debugCode });

    expect(statusCode).toBe(200);
    expect(body.isNew).toBe(true);
    expect(body.accessToken).toEqual(expect.any(String));
    expect(body.customer).toMatchObject({
      phone,
      isPhoneVerified: true,
      isGoogleLinked: false,
      addresses: [],
    });
    expect(body.customer.googleSub).toBeUndefined();
    expect(
      findCookie(headers['set-cookie'], CUSTOMER_REFRESH_COOKIE),
    ).toBeDefined();
    expect(
      findCookie(headers['set-cookie'], CUSTOMER_SESSION_HINT_COOKIE),
    ).toBe(`${CUSTOMER_SESSION_HINT_COOKIE}=1`);
  });

  it('should log the same customer in on the next login', async () => {
    const { phone, customerId } = await loginCustomerWithOtp();
    await Motp.collection.updateMany(
      { phone },
      { $set: { createdAt: new Date(0) } },
    );

    const { body: requestBody } = await supertest(app.app)
      .post('/auth/customer/otp/request')
      .send({ phone });
    const { body } = await supertest(app.app)
      .post('/auth/customer/otp/verify')
      .send({ phone, code: requestBody.debugCode });

    expect(body.isNew).toBe(false);
    expect(body.customer.id).toBe(customerId);
    expect(await Mcustomer.countDocuments({ phone })).toBe(1);
  });

  it('should return 401 OTP_INVALID for a wrong code and not reuse a consumed code', async () => {
    const phone = randomBrazilianMobile();
    const { body: requestBody } = await supertest(app.app)
      .post('/auth/customer/otp/request')
      .send({ phone });
    const wrongCode = requestBody.debugCode === '000000' ? '111111' : '000000';

    const wrong = await supertest(app.app)
      .post('/auth/customer/otp/verify')
      .send({ phone, code: wrongCode });
    await supertest(app.app)
      .post('/auth/customer/otp/verify')
      .send({ phone, code: requestBody.debugCode });
    const reused = await supertest(app.app)
      .post('/auth/customer/otp/verify')
      .send({ phone, code: requestBody.debugCode });

    expect(wrong.statusCode).toBe(401);
    expect(wrong.body.code).toBe('OTP_INVALID');
    expect(reused.statusCode).toBe(401);
  });

  it('should not log into an account whose phone is only a contact phone (CUS-R05)', async () => {
    const phone = randomBrazilianMobile();
    await Mcustomer.create({
      id: 'contact-phone-owner',
      phone,
      addresses: [],
      lastLoginAt: new Date(),
    });

    const { customerId } = await loginCustomerWithOtp(phone);

    expect(customerId).not.toBe('contact-phone-owner');
  });
});

describe('When we refresh the customer session', () => {
  it('should rotate the refresh cookie and return a new access token', async () => {
    const { setCookie } = await loginCustomerWithOtp();
    const refreshCookie = findCookie(setCookie, CUSTOMER_REFRESH_COOKIE)!;

    const { body, statusCode, headers } = await supertest(app.app)
      .post('/auth/customer/refresh')
      .set('Cookie', refreshCookie);

    expect(statusCode).toBe(200);
    expect(body.accessToken).toEqual(expect.any(String));
    const rotatedCookie = findCookie(
      headers['set-cookie'],
      CUSTOMER_REFRESH_COOKIE,
    );
    expect(rotatedCookie).toBeDefined();
    expect(rotatedCookie).not.toBe(refreshCookie);
  });

  it('should revoke the whole session family when an old refresh token is reused', async () => {
    const { setCookie } = await loginCustomerWithOtp();
    const firstCookie = findCookie(setCookie, CUSTOMER_REFRESH_COOKIE)!;
    const { headers } = await supertest(app.app)
      .post('/auth/customer/refresh')
      .set('Cookie', firstCookie);
    const secondCookie = findCookie(
      headers['set-cookie'],
      CUSTOMER_REFRESH_COOKIE,
    )!;

    const reuse = await supertest(app.app)
      .post('/auth/customer/refresh')
      .set('Cookie', firstCookie);
    const afterReuse = await supertest(app.app)
      .post('/auth/customer/refresh')
      .set('Cookie', secondCookie);

    expect(reuse.statusCode).toBe(401);
    expect(reuse.body.code).toBe('SESSION_REVOKED');
    expect(afterReuse.statusCode).toBe(401);
  });

  it('should return 401 SESSION_MISSING without the cookie', async () => {
    const { body, statusCode } = await supertest(app.app).post(
      '/auth/customer/refresh',
    );

    expect(statusCode).toBe(401);
    expect(body.code).toBe('SESSION_MISSING');
  });
});

describe('When the customer logs out', () => {
  it('should revoke the session and clear the cookies', async () => {
    const { setCookie } = await loginCustomerWithOtp();
    const refreshCookie = findCookie(setCookie, CUSTOMER_REFRESH_COOKIE)!;

    const logout = await supertest(app.app)
      .post('/auth/customer/logout')
      .set('Cookie', refreshCookie);
    const refreshAfterLogout = await supertest(app.app)
      .post('/auth/customer/refresh')
      .set('Cookie', refreshCookie);

    expect(logout.statusCode).toBe(204);
    expect(
      findCookie(logout.headers['set-cookie'], CUSTOMER_REFRESH_COOKIE),
    ).toBe(`${CUSTOMER_REFRESH_COOKIE}=`);
    expect(refreshAfterLogout.statusCode).toBe(401);
  });

  it('should answer 204 even without a session', async () => {
    const { statusCode } = await supertest(app.app).post(
      '/auth/customer/logout',
    );

    expect(statusCode).toBe(204);
  });
});
