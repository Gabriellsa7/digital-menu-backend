import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { CouponController } from '../../../interfaces/http/controllers/coupon.controller';
import { CouponServiceFactory } from './coupon.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class CouponControllerFactory {
  static create(): IController {
    return new CouponController({
      couponService: CouponServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
