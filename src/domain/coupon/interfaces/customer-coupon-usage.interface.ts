export interface ICustomerCouponUsage {
  countCouponUsesByCustomer(
    customerId: string,
    couponId: string,
  ): Promise<number>;
  hasCompletedOrder(customerId: string, storeId: string): Promise<boolean>;
}
