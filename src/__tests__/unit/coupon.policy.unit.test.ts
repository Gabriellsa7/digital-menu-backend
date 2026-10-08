import {
  assertCouponApplicable,
  calculateCouponDiscount,
  ICouponContext,
} from '../../domain/coupon/policies/coupon.policy';
import { Coupon } from '../../domain/coupon/coupon.entity';
import {
  ECouponType,
  ICoupon,
} from '../../domain/coupon/interfaces/coupon.interface';
import { EFulfillmentType } from '../../domain/order/interfaces/order.interface';

const NOW = new Date('2026-10-01T12:00:00Z');

function aCoupon(overrides: Partial<ICoupon> = {}): ICoupon {
  return {
    id: 'coupon-1',
    storeId: 'store-1',
    isPublic: false,
    code: 'BEMVINDO10',
    type: ECouponType.PERCENTAGE,
    value: 10,
    minOrderInCents: 0,
    startsAt: new Date('2026-09-01T00:00:00Z'),
    expiresAt: new Date('2026-12-01T00:00:00Z'),
    usagePerCustomer: 1,
    usedCount: 0,
    firstOrderOnly: false,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function aContext(overrides: Partial<ICouponContext> = {}): ICouponContext {
  return {
    now: NOW,
    subtotalInCents: 5000,
    deliveryFeeInCents: 790,
    fulfillmentType: EFulfillmentType.DELIVERY,
    customerUses: 0,
    hasCompletedOrder: false,
    ...overrides,
  };
}

describe('When we check whether a coupon applies', () => {
  it('should accept a valid coupon', () => {
    expect(() => assertCouponApplicable(aCoupon(), aContext())).not.toThrow();
  });

  it.each([
    ['inactive (CPN-R02)', { isActive: false }, {}, 'COUPON_INACTIVE'],
    [
      'not started (CPN-R02)',
      { startsAt: new Date('2026-10-02T00:00:00Z') },
      {},
      'COUPON_EXPIRED',
    ],
    ['expired (CPN-R02)', { expiresAt: NOW }, {}, 'COUPON_EXPIRED'],
    [
      'below the minimum (CPN-R03)',
      { minOrderInCents: 6000 },
      {},
      'COUPON_MIN_ORDER',
    ],
    [
      'exhausted (CPN-R04)',
      { usageLimit: 10, usedCount: 10 },
      {},
      'COUPON_EXHAUSTED',
    ],
    [
      'already used by the customer (CPN-R05)',
      { usagePerCustomer: 2 },
      { customerUses: 2 },
      'COUPON_ALREADY_USED',
    ],
    [
      'first order only for a returning customer (CPN-R06)',
      { firstOrderOnly: true },
      { hasCompletedOrder: true },
      'COUPON_FIRST_ORDER_ONLY',
    ],
    [
      'free delivery on pickup (CPN-R07)',
      { type: ECouponType.FREE_DELIVERY, value: 0 },
      { fulfillmentType: EFulfillmentType.PICKUP },
      'COUPON_DELIVERY_ONLY',
    ],
  ])('should reject a coupon %s', (_case, coupon, context, code) => {
    expect(() =>
      assertCouponApplicable(aCoupon(coupon), aContext(context)),
    ).toThrow(expect.objectContaining({ code }));
  });
});

describe('When we calculate the discount (CPN-R07, R08)', () => {
  it.each([
    ['10% of 50.00', { value: 10 }, {}, 500],
    ['15% of 33.33 rounded down', { value: 15 }, { subtotalInCents: 3333 }, 499],
    ['20% capped at 5.00', { value: 20, maxDiscountInCents: 500 }, {}, 500],
    ['fixed 10.00', { type: ECouponType.FIXED, value: 1000 }, {}, 1000],
    [
      'fixed above the subtotal',
      { type: ECouponType.FIXED, value: 8000 },
      {},
      5000,
    ],
    [
      'free delivery',
      { type: ECouponType.FREE_DELIVERY, value: 0 },
      {},
      790,
    ],
  ])('should discount %s', (_case, coupon, context, expected) => {
    expect(calculateCouponDiscount(aCoupon(coupon), aContext(context))).toBe(
      expected,
    );
  });
});

describe('When we build a coupon (CPN-R01)', () => {
  it('should normalize the code to uppercase', () => {
    expect(new Coupon(aCoupon({ code: ' bemvindo10 ' })).code).toBe(
      'BEMVINDO10',
    );
  });

  it.each([
    ['a short code', { code: 'ABC' }, 'INVALID_COUPON_CODE'],
    ['a code with symbols', { code: 'OFF-10' }, 'INVALID_COUPON_CODE'],
    ['a percentage above 100', { value: 120 }, 'INVALID_COUPON_VALUE'],
    [
      'a fixed coupon without value',
      { type: ECouponType.FIXED, value: 0 },
      'INVALID_COUPON_VALUE',
    ],
    [
      'an end before the start',
      { expiresAt: new Date('2026-08-01T00:00:00Z') },
      'INVALID_COUPON_PERIOD',
    ],
  ])('should reject %s', (_case, overrides, code) => {
    expect(() => new Coupon(aCoupon(overrides))).toThrow(
      expect.objectContaining({ code }),
    );
  });
});
