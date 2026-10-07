import { CouponService } from '../../../domain/coupon/service/coupon.service';
import { SystemClock } from '../../common/system.clock';
import { CouponRepositoryRead } from '../../repository/coupon/coupon.repository.read';
import { CouponRepositoryWrite } from '../../repository/coupon/coupon.repository.write';
import { OrderRepositoryRead } from '../../repository/order/order.repository.read';

export class CouponServiceFactory {
  static create() {
    return new CouponService({
      couponRepositoryRead: new CouponRepositoryRead(),
      couponRepositoryWrite: new CouponRepositoryWrite(),
      customerCouponUsage: new OrderRepositoryRead(),
      clock: new SystemClock(),
    });
  }
}
