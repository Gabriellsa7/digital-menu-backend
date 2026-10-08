import '../types/express-request';
import { RequestHandler } from 'express';
import { ESubjectType } from '../../../domain/auth/interfaces/auth-subject.interface';
import { EStaffRole } from '../../../domain/staff-user/interfaces/staff-user.interface';
import { ForbiddenError } from '../../../domain/errors/forbidden.error';
import { UnauthorizedError } from '../../../domain/errors/unauthorized.error';

export interface IParamsAuthorize {
  subjectType: ESubjectType;
  roles?: EStaffRole[];
}

export function authorize({
  subjectType,
  roles,
}: IParamsAuthorize): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) {
      next(new UnauthorizedError('Missing access token', 'TOKEN_MISSING'));
      return;
    }
    const hasAllowedRole =
      !roles || (req.auth.role !== undefined && roles.includes(req.auth.role));
    if (req.auth.subjectType !== subjectType || !hasAllowedRole) {
      next(new ForbiddenError());
      return;
    }
    if (subjectType === ESubjectType.STAFF && !req.auth.storeId) {
      next(new UnauthorizedError('Invalid access token', 'TOKEN_INVALID'));
      return;
    }
    next();
  };
}
