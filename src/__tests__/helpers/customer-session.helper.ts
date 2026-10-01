import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';

export function randomBrazilianMobile(): string {
  const subscriber = Math.floor(Math.random() * 1e8)
    .toString()
    .padStart(8, '0');
  return `+55119${subscriber}`;
}

/** Returns the `name=value` pair of a Set-Cookie header, ready for `.set('Cookie', ...)` */
export function findCookie(
  setCookieHeader: string[] | string | undefined,
  name: string,
): string | undefined {
  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader ?? ''];
  return cookies.find((cookie) => cookie.startsWith(`${name}=`))?.split(';')[0];
}

/**
 * Logs a customer in through the real OTP endpoints, reading the simulated
 * code from `debugCode` (OTP_EXPOSE_CODE=true in .env.test).
 */
export async function loginCustomerWithOtp(phone = randomBrazilianMobile()) {
  const requestResponse = await supertest(app.app)
    .post('/auth/customer/otp/request')
    .send({ phone });
  const verifyResponse = await supertest(app.app)
    .post('/auth/customer/otp/verify')
    .send({ phone, code: requestResponse.body.debugCode });

  return {
    phone,
    accessToken: verifyResponse.body.accessToken as string,
    customerId: verifyResponse.body.customer.id as string,
    setCookie: verifyResponse.headers['set-cookie'],
  };
}
