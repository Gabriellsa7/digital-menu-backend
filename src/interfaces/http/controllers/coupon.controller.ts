import { Router, Request, Response, NextFunction } from 'express';
import { IController } from './controller.interface';
import { ITokenService } from '../../../domain/auth/interfaces/token.service.interface';
import {
  ICouponService,
  IParamsCouponData,
} from '../../../domain/coupon/interfaces/coupon.service.interface';
import { createAuthGuards } from '../middlewares/auth-guards';
import {
  toCouponResponse,
  toCouponValidationResponse,
} from '../presenters/coupon.presenter';

type TIdParams = { id: string };

export interface IParamsCouponController {
  couponService: ICouponService;
  tokenService: ITokenService;
}

export class CouponController implements IController {
  router: Router;
  private readonly couponService: ICouponService;
  private readonly tokenService: ITokenService;

  constructor({ couponService, tokenService }: IParamsCouponController) {
    this.couponService = couponService;
    this.tokenService = tokenService;
    this.router = Router();
    this.initRoutes();
  }

  initRoutes() {
    const { owner, customer } = createAuthGuards(this.tokenService);
    this.router.get('/admin/coupons', ...owner, this.list);
    this.router.post('/admin/coupons', ...owner, this.create);
    this.router.put('/admin/coupons/:id', ...owner, this.update);
    this.router.patch('/admin/coupons/:id/active', ...owner, this.setActive);
    this.router.post('/me/coupons/validate', ...customer, this.validate);
  }

  list = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { active } = req.query;
      const coupons = await this.couponService.listCoupons(
        active === undefined ? undefined : String(active) === 'true',
      );
      res.status(200).json(coupons.map(toCouponResponse));
    } catch (error) {
      next(error);
    }
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const coupon = await this.couponService.createCoupon(
        this.couponData(req.body),
      );
      res.status(201).json(toCouponResponse(coupon));
    } catch (error) {
      next(error);
    }
  };

  update = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const coupon = await this.couponService.updateCoupon({
        id: req.params.id,
        ...this.couponData(req.body),
      });
      res.status(200).json(toCouponResponse(coupon));
    } catch (error) {
      next(error);
    }
  };

  setActive = async (
    req: Request<TIdParams>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const coupon = await this.couponService.setCouponActive(
        req.params.id,
        req.body.isActive,
      );
      res.status(200).json(toCouponResponse(coupon));
    } catch (error) {
      next(error);
    }
  };

  validate = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const validation = await this.couponService.validateCouponForCustomer({
        code: req.body.code,
        customerId: req.auth!.subjectId,
        subtotalInCents: req.body.subtotalInCents,
        deliveryFeeInCents: req.body.deliveryFeeInCents ?? 0,
        fulfillmentType: req.body.fulfillmentType,
      });
      res.status(200).json(toCouponValidationResponse(validation));
    } catch (error) {
      next(error);
    }
  };

  public getRoutes(): Router {
    return this.router;
  }

  private couponData(body: Record<string, unknown>): IParamsCouponData {
    return {
      code: body.code as string,
      type: body.type as IParamsCouponData['type'],
      value: body.value as number,
      maxDiscountInCents: body.maxDiscountInCents as number | undefined,
      minOrderInCents: (body.minOrderInCents as number | undefined) ?? 0,
      startsAt: new Date(body.startsAt as string),
      expiresAt: new Date(body.expiresAt as string),
      usageLimit: body.usageLimit as number | undefined,
      usagePerCustomer: (body.usagePerCustomer as number | undefined) ?? 1,
      firstOrderOnly: Boolean(body.firstOrderOnly),
      isActive: (body.isActive as boolean | undefined) ?? true,
    };
  }
}
