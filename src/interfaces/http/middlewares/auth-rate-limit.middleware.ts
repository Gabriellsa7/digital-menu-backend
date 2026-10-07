import { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { TooManyRequestsError } from '../../../domain/errors/too-many-requests.error';

const AUTH_RATE_LIMIT_WINDOW_MILLISECONDS = 15 * 60 * 1000;

export function authRateLimit(maxRequests: number): RequestHandler {
  return rateLimit({
    windowMs: AUTH_RATE_LIMIT_WINDOW_MILLISECONDS,
    limit: maxRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, _res, next) => {
      const resetTime = (req as typeof req & { rateLimit?: { resetTime?: Date } })
        .rateLimit?.resetTime;
      const retryAfterSeconds = resetTime
        ? Math.max(1, Math.ceil((resetTime.getTime() - Date.now()) / 1000))
        : AUTH_RATE_LIMIT_WINDOW_MILLISECONDS / 1000;
      next(
        new TooManyRequestsError(
          'Too many authentication attempts',
          retryAfterSeconds,
          'AUTH_RATE_LIMITED',
        ),
      );
    },
  });
}
