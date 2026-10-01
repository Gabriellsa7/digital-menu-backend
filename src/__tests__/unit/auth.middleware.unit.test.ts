import { NextFunction, Request, Response } from 'express';
import { ESubjectType } from '../../domain/auth/interfaces/auth-subject.interface';
import { ITokenService } from '../../domain/auth/interfaces/token.service.interface';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { ForbiddenError } from '../../domain/errors/forbidden.error';
import { UnauthorizedError } from '../../domain/errors/unauthorized.error';
import { authenticate } from '../../interfaces/http/middlewares/authenticate.middleware';
import { authorize } from '../../interfaces/http/middlewares/authorize.middleware';

const res = {} as Response;

function aRequest(overrides: Partial<Request> = {}): Request {
  return { headers: {}, ...overrides } as Request;
}

describe('When we authenticate a request', () => {
  const tokenService = {
    verifyAccessToken: jest.fn(),
  } as unknown as jest.Mocked<ITokenService>;

  it('should expose the subject of a valid bearer token', () => {
    tokenService.verifyAccessToken.mockReturnValue({
      sub: 'staff-1',
      typ: ESubjectType.STAFF,
      role: EStaffRole.STAFF,
    });
    const req = aRequest({ headers: { authorization: 'Bearer valid' } });
    const next = jest.fn();

    authenticate(tokenService)(req, res, next);

    expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('valid');
    expect(req.auth).toEqual({
      subjectId: 'staff-1',
      subjectType: ESubjectType.STAFF,
      role: EStaffRole.STAFF,
    });
    expect(next).toHaveBeenCalledWith();
  });

  it('should fail with TOKEN_MISSING without a bearer header', () => {
    const next = jest.fn();

    authenticate(tokenService)(
      aRequest({ headers: { authorization: 'Basic abc' } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'TOKEN_MISSING' }),
    );
  });

  it('should pass verification errors to the error handler', () => {
    const error = new UnauthorizedError(
      'Invalid access token',
      'TOKEN_INVALID',
    );
    tokenService.verifyAccessToken.mockImplementation(() => {
      throw error;
    });
    const next = jest.fn();

    authenticate(tokenService)(
      aRequest({ headers: { authorization: 'Bearer forged' } }),
      res,
      next,
    );

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('When we authorize a request', () => {
  function runAuthorize(
    auth: Request['auth'],
    params: Parameters<typeof authorize>[0],
  ): NextFunction & jest.Mock {
    const next = jest.fn();
    authorize(params)(aRequest({ auth }), res, next);
    return next;
  }

  it('should let the expected subject type through', () => {
    const next = runAuthorize(
      { subjectId: 'customer-1', subjectType: ESubjectType.CUSTOMER },
      { subjectType: ESubjectType.CUSTOMER },
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('should forbid another subject type', () => {
    const next = runAuthorize(
      { subjectId: 'customer-1', subjectType: ESubjectType.CUSTOMER },
      { subjectType: ESubjectType.STAFF },
    );

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should forbid a staff role that is not allowed', () => {
    const next = runAuthorize(
      {
        subjectId: 'staff-1',
        subjectType: ESubjectType.STAFF,
        role: EStaffRole.STAFF,
      },
      { subjectType: ESubjectType.STAFF, roles: [EStaffRole.OWNER] },
    );

    expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
  });

  it('should let an allowed staff role through', () => {
    const next = runAuthorize(
      {
        subjectId: 'staff-1',
        subjectType: ESubjectType.STAFF,
        role: EStaffRole.OWNER,
      },
      { subjectType: ESubjectType.STAFF, roles: [EStaffRole.OWNER] },
    );

    expect(next).toHaveBeenCalledWith();
  });

  it('should fail with TOKEN_MISSING when authenticate did not run', () => {
    const next = runAuthorize(undefined, {
      subjectType: ESubjectType.CUSTOMER,
    });

    expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError));
  });
});
