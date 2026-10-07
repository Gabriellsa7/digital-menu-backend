import { CouponService } from '../../../domain/coupon/service/coupon.service';
import { SystemClock } from '../../common/system.clock';
import { NoOrdersCustomerCouponUsage } from '../../order/no-orders.customer-coupon.usage';
import { CouponRepositoryRead } from '../../repository/coupon/coupon.repository.read';
import { CouponRepositoryWrite } from '../../repository/coupon/coupon.repository.write';

export class CouponServiceFactory {
  static create() {
    return new CouponService({
      couponRepositoryRead: new CouponRepositoryRead(),
      couponRepositoryWrite: new CouponRepositoryWrite(),
      customerCouponUsage: new NoOrdersCustomerCouponUsage(),
      clock: new SystemClock(),
    });
  }
}
