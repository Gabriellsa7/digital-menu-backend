import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { IStaffAuthService } from '../../../domain/auth/interfaces/staff-auth.service.interface';
import { UnauthorizedError } from '../../../domain/errors/unauthorized.error';
import { ICookieSettings } from '../cookies/customer-session.cookie';
import {
  STAFF_REFRESH_COOKIE,
  clearStaffSessionCookie,
  setStaffSessionCookie,
} from '../cookies/staff-session.cookie';
import { authRateLimit } from '../middlewares/auth-rate-limit.middleware';
import { toStaffUserResponse } from '../presenters/staff-user.presenter';

export interface IParamsStaffAuthController {
  staffAuthService: IStaffAuthService;
  cookieSettings: ICookieSettings;
  authRateLimitMax: number;
}

export class StaffAuthController implements IController {
  router: Router;
  private readonly staffAuthService: IStaffAuthService;
  private readonly cookieSettings: ICookieSettings;

  constructor({
    staffAuthService,
    cookieSettings,
    authRateLimitMax,
  }: IParamsStaffAuthController) {
    this.staffAuthService = staffAuthService;
    this.cookieSettings = cookieSettings;
    this.router = Router();
    this.initRoutes(authRateLimitMax);
  }

  initRoutes(authRateLimitMax: number) {
    this.router.post(
      '/auth/staff/login',
      authRateLimit(authRateLimitMax),
      this.login,
    );
    this.router.post('/auth/staff/refresh', this.refreshSession);
    this.router.post('/auth/staff/logout', this.logout);
  }

  login = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { email, password } = req.body;
      const { staffUser, tokens } = await this.staffAuthService.login({
        email,
        password,
        userAgent: req.get('user-agent'),
      });
      setStaffSessionCookie(
        res,
        this.cookieSettings,
        tokens.refreshToken,
        tokens.refreshTokenExpiresAt,
      );
      res.status(200).json({
        accessToken: tokens.accessToken,
        accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
        staffUser: toStaffUserResponse(staffUser),
      });
    } catch (error) {
      next(error);
    }
  };

  refreshSession = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const refreshToken: string | undefined =
        req.cookies?.[STAFF_REFRESH_COOKIE];
      if (!refreshToken) {
        throw new UnauthorizedError('Missing session', 'SESSION_MISSING');
      }

      const tokens = await this.staffAuthService.refreshSession({
        refreshToken,
        userAgent: req.get('user-agent'),
      });
      setStaffSessionCookie(
        res,
        this.cookieSettings,
        tokens.refreshToken,
        tokens.refreshTokenExpiresAt,
      );
      res.status(200).json({
        accessToken: tokens.accessToken,
        accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
      });
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        clearStaffSessionCookie(res, this.cookieSettings);
      }
      next(error);
    }
  };

  logout = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      await this.staffAuthService.logout(req.cookies?.[STAFF_REFRESH_COOKIE]);
      clearStaffSessionCookie(res, this.cookieSettings);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }
}
