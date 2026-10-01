import '../types/express-request';
import { RequestHandler } from 'express';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import { UnauthorizedError } from '../../../domain/errors/unauthorized.error';

const BEARER_PREFIX = 'Bearer ';

/**
 * Verifies the `Authorization: Bearer <access token>` header and exposes the
 * subject as `req.auth`. Use it together with `authorize`.
 */
export function authenticate(tokenService: ITokenService): RequestHandler {
  return (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith(BEARER_PREFIX)) {
      next(new UnauthorizedError('Missing access token', 'TOKEN_MISSING'));
      return;
    }

    try {
      const payload = tokenService.verifyAccessToken(
        header.slice(BEARER_PREFIX.length),
      );
      req.auth = {
        subjectId: payload.sub,
        subjectType: payload.typ,
        ...(payload.role && { role: payload.role }),
      };
      next();
    } catch (error) {
      next(error);
    }
  };
}
