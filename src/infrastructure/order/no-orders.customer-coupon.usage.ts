import { ICustomerCouponUsage } from '../../domain/coupon/interfaces/customer-coupon-usage.interface';

export class NoOrdersCustomerCouponUsage implements ICustomerCouponUsage {
  async countCouponUsesByCustomer(): Promise<number> {
    return 0;
  }

  async hasCompletedOrder(): Promise<boolean> {
    return false;
  }
}
