import { CookieOptions, Response } from 'express';
import { ICookieSettings } from './customer-session.cookie';

export const STAFF_REFRESH_COOKIE = 'dm_rt_staff';
const REFRESH_COOKIE_PATH = '/auth/staff';

function refreshCookieOptions(settings: ICookieSettings): CookieOptions {
  return {
    httpOnly: true,
    secure: settings.secure,
    sameSite: 'lax',
    path: REFRESH_COOKIE_PATH,
    ...(settings.domain && { domain: settings.domain }),
  };
}

export function setStaffSessionCookie(
  res: Response,
  settings: ICookieSettings,
  refreshToken: string,
  expiresAt: Date,
): void {
  res.cookie(STAFF_REFRESH_COOKIE, refreshToken, {
    ...refreshCookieOptions(settings),
    expires: expiresAt,
  });
}

export function clearStaffSessionCookie(
  res: Response,
  settings: ICookieSettings,
): void {
  res.clearCookie(STAFF_REFRESH_COOKIE, refreshCookieOptions(settings));
}
