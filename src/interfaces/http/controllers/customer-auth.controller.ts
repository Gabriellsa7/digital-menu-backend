import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import {
  ICustomerAuthResult,
  ICustomerAuthService,
} from '../../../domain/auth/interfaces/customer-auth.service.interface';
import { UnauthorizedError } from '../../../domain/errors/unauthorized.error';
import {
  CUSTOMER_REFRESH_COOKIE,
  ICookieSettings,
  clearCustomerSessionCookies,
  setCustomerSessionCookies,
} from '../cookies/customer-session.cookie';
import { toCustomerResponse } from '../presenters/customer.presenter';

export interface IParamsCustomerAuthController {
  customerAuthService: ICustomerAuthService;
  cookieSettings: ICookieSettings;
}

export class CustomerAuthController implements IController {
  router: Router;
  private readonly customerAuthService: ICustomerAuthService;
  private readonly cookieSettings: ICookieSettings;

  constructor({
    customerAuthService,
    cookieSettings,
  }: IParamsCustomerAuthController) {
    this.customerAuthService = customerAuthService;
    this.cookieSettings = cookieSettings;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    this.router.post('/auth/customer/otp/request', this.requestOtpCode);
    this.router.post('/auth/customer/otp/verify', this.loginWithOtp);
    this.router.post('/auth/customer/google', this.loginWithGoogle);
    this.router.post('/auth/customer/refresh', this.refreshSession);
    this.router.post('/auth/customer/logout', this.logout);
  }

  requestOtpCode = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.customerAuthService.requestOtpCode(
        req.body.phone,
      );
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  loginWithOtp = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { phone, code } = req.body;
      const result = await this.customerAuthService.loginWithOtp({
        phone,
        code,
        userAgent: req.get('user-agent'),
      });
      this.sendAuthResponse(res, result);
    } catch (error) {
      next(error);
    }
  };

  loginWithGoogle = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.customerAuthService.loginWithGoogle({
        idToken: req.body.idToken,
        userAgent: req.get('user-agent'),
      });
      this.sendAuthResponse(res, result);
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
        req.cookies?.[CUSTOMER_REFRESH_COOKIE];
      if (!refreshToken) {
        throw new UnauthorizedError('Missing session', 'SESSION_MISSING');
      }

      const tokens = await this.customerAuthService.refreshSession({
        refreshToken,
        userAgent: req.get('user-agent'),
      });
      setCustomerSessionCookies(
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
        clearCustomerSessionCookies(res, this.cookieSettings);
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
      await this.customerAuthService.logout(
        req.cookies?.[CUSTOMER_REFRESH_COOKIE],
      );
      clearCustomerSessionCookies(res, this.cookieSettings);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }

  private sendAuthResponse(
    res: Response,
    { customer, isNew, tokens }: ICustomerAuthResult,
  ): void {
    setCustomerSessionCookies(
      res,
      this.cookieSettings,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
    );
    res.status(200).json({
      accessToken: tokens.accessToken,
      accessTokenExpiresInSeconds: tokens.accessTokenExpiresInSeconds,
      isNew,
      customer: toCustomerResponse(customer),
    });
  }
}
