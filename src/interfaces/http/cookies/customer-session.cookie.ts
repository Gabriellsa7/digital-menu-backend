import { CookieOptions, Response } from 'express';

export const CUSTOMER_REFRESH_COOKIE = 'dm_rt_customer';
// Non-sensitive flag the Next.js proxy reads to redirect logged-out visitors
// before rendering; the API still validates every request.
export const CUSTOMER_SESSION_HINT_COOKIE = 'dm_customer_session';
const REFRESH_COOKIE_PATH = '/auth/customer';

export interface ICookieSettings {
  secure: boolean;
  domain?: string;
}

function baseOptions(settings: ICookieSettings): CookieOptions {
  return {
    secure: settings.secure,
    sameSite: 'lax',
    ...(settings.domain && { domain: settings.domain }),
  };
}

export function setCustomerSessionCookies(
  res: Response,
  settings: ICookieSettings,
  refreshToken: string,
  expiresAt: Date,
): void {
  res.cookie(CUSTOMER_REFRESH_COOKIE, refreshToken, {
    ...baseOptions(settings),
    httpOnly: true,
    path: REFRESH_COOKIE_PATH,
    expires: expiresAt,
  });
  res.cookie(CUSTOMER_SESSION_HINT_COOKIE, '1', {
    ...baseOptions(settings),
    path: '/',
    expires: expiresAt,
  });
}

export function clearCustomerSessionCookies(
  res: Response,
  settings: ICookieSettings,
): void {
  res.clearCookie(CUSTOMER_REFRESH_COOKIE, {
    ...baseOptions(settings),
    httpOnly: true,
    path: REFRESH_COOKIE_PATH,
  });
  res.clearCookie(CUSTOMER_SESSION_HINT_COOKIE, {
    ...baseOptions(settings),
    path: '/',
  });
}
