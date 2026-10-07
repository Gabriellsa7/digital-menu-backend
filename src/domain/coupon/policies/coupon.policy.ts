import { BusinessRuleError } from '../../errors/business-rule.error';
import { EFulfillmentType } from '../../order/interfaces/order.interface';
import { ECouponType, ICoupon } from '../interfaces/coupon.interface';

export interface ICouponContext {
  now: Date;
  subtotalInCents: number;
  deliveryFeeInCents: number;
  fulfillmentType: EFulfillmentType;
  customerUses: number;
  hasCompletedOrder: boolean;
}

function fail(message: string, code: string): never {
  throw new BusinessRuleError(message, code);
}

export function assertCouponApplicable(
  coupon: ICoupon,
  context: ICouponContext,
): void {
  if (!coupon.isActive) {
    fail('Coupon is inactive', 'COUPON_INACTIVE');
  }
  const now = context.now.getTime();
  if (now < coupon.startsAt.getTime() || now >= coupon.expiresAt.getTime()) {
    fail('Coupon is expired or not valid yet', 'COUPON_EXPIRED');
  }
  if (context.subtotalInCents < coupon.minOrderInCents) {
    fail('Order subtotal is below the coupon minimum', 'COUPON_MIN_ORDER');
  }
  if (
    coupon.usageLimit !== undefined &&
    coupon.usedCount >= coupon.usageLimit
  ) {
    fail('Coupon is exhausted', 'COUPON_EXHAUSTED');
  }
  if (context.customerUses >= coupon.usagePerCustomer) {
    fail('Coupon was already used', 'COUPON_ALREADY_USED');
  }
  if (coupon.firstOrderOnly && context.hasCompletedOrder) {
    fail('Coupon is valid only on the first order', 'COUPON_FIRST_ORDER_ONLY');
  }
  if (
    coupon.type === ECouponType.FREE_DELIVERY &&
    context.fulfillmentType !== EFulfillmentType.DELIVERY
  ) {
    fail('Free delivery coupons need a delivery order', 'COUPON_DELIVERY_ONLY');
  }
}

export function calculateCouponDiscount(
  coupon: ICoupon,
  { subtotalInCents, deliveryFeeInCents }: ICouponContext,
): number {
  if (coupon.type === ECouponType.FREE_DELIVERY) {
    return deliveryFeeInCents;
  }
  const discount =
    coupon.type === ECouponType.PERCENTAGE
      ? Math.floor((subtotalInCents * coupon.value) / 100)
      : coupon.value;
  const capped =
    coupon.type === ECouponType.PERCENTAGE &&
    coupon.maxDiscountInCents !== undefined
      ? Math.min(discount, coupon.maxDiscountInCents)
      : discount;
  return Math.min(capped, subtotalInCents);
}
