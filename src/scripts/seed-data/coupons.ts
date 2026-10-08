import { ECouponType } from '../../domain/coupon/interfaces/coupon.interface';

const ONE_YEAR_IN_MILLISECONDS = 365 * 24 * 60 * 60 * 1000;

export function couponsSeed(now: Date) {
  const period = {
    startsAt: now,
    expiresAt: new Date(now.getTime() + ONE_YEAR_IN_MILLISECONDS),
  };
  return [
    {
      ...period,
      code: 'BEMVINDO10',
      type: ECouponType.PERCENTAGE,
      value: 10,
      maxDiscountInCents: 2000,
      minOrderInCents: 3000,
      usagePerCustomer: 1,
      firstOrderOnly: true,
      isActive: true,
    },
    {
      ...period,
      code: 'FRETEGRATIS',
      type: ECouponType.FREE_DELIVERY,
      value: 0,
      minOrderInCents: 5000,
      usagePerCustomer: 3,
      firstOrderOnly: false,
      isActive: true,
    },
    {
      ...period,
      code: 'DESCONTO15',
      type: ECouponType.FIXED,
      value: 1500,
      minOrderInCents: 6000,
      usageLimit: 100,
      usagePerCustomer: 1,
      firstOrderOnly: false,
      isActive: true,
    },
  ];
}
