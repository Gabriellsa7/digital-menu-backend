import { CouponService } from '../../domain/coupon/service/coupon.service';
import { ICouponRepositoryRead } from '../../domain/coupon/repository/coupon.repository.read';
import { ICouponRepositoryWrite } from '../../domain/coupon/repository/coupon.repository.write';
import { ICustomerCouponUsage } from '../../domain/coupon/interfaces/customer-coupon-usage.interface';
import {
  ECouponType,
  ICoupon,
} from '../../domain/coupon/interfaces/coupon.interface';
import { EFulfillmentType } from '../../domain/order/interfaces/order.interface';
import { ConflictError } from '../../domain/errors/conflict.error';
import { FixedClock } from '../helpers/fixed.clock';

const clock = new FixedClock();
const COUPON_DATA = {
  code: 'desconto15',
  type: ECouponType.PERCENTAGE,
  value: 15,
  maxDiscountInCents: 1000,
  minOrderInCents: 2000,
  startsAt: new Date('2026-09-01T00:00:00Z'),
  expiresAt: new Date('2026-12-01T00:00:00Z'),
  usagePerCustomer: 1,
  firstOrderOnly: false,
  isActive: true,
};

function aCoupon(overrides: Partial<ICoupon> = {}): ICoupon {
  return {
    ...COUPON_DATA,
    code: 'DESCONTO15',
    id: 'coupon-1',
    usedCount: 0,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

let couponRepositoryRead: jest.Mocked<ICouponRepositoryRead>;
let couponRepositoryWrite: jest.Mocked<ICouponRepositoryWrite>;
let customerCouponUsage: jest.Mocked<ICustomerCouponUsage>;
let couponService: CouponService;

beforeEach(() => {
  couponRepositoryRead = {
    findCouponById: jest.fn().mockResolvedValue(aCoupon()),
    findCouponByCode: jest.fn().mockResolvedValue(null),
    listCoupons: jest.fn().mockResolvedValue([]),
  };
  couponRepositoryWrite = {
    createCoupon: jest.fn(async (coupon) => ({ ...coupon })),
    updateCouponById: jest.fn(async (id, { set = {} }) => ({
      ...aCoupon({ id }),
      ...set,
    })),
    incrementCouponUsage: jest.fn().mockResolvedValue(true),
    decrementCouponUsage: jest.fn(),
  };
  customerCouponUsage = {
    countCouponUsesByCustomer: jest.fn().mockResolvedValue(0),
    hasCompletedOrder: jest.fn().mockResolvedValue(false),
  };
  couponService = new CouponService({
    couponRepositoryRead,
    couponRepositoryWrite,
    customerCouponUsage,
    clock,
  });
});

describe('When the owner creates a coupon', () => {
  it('should store the code uppercase with no uses', async () => {
    const coupon = await couponService.createCoupon(COUPON_DATA);

    expect(coupon).toMatchObject({ code: 'DESCONTO15', usedCount: 0 });
  });

  it('should reject a code already in use (CPN-R01)', async () => {
    couponRepositoryRead.findCouponByCode.mockResolvedValue(
      aCoupon({ id: 'other' }),
    );

    await expect(couponService.createCoupon(COUPON_DATA)).rejects.toThrow(
      ConflictError,
    );
  });
});

describe('When the owner updates a coupon', () => {
  it('should remove the optional limits that were not sent', async () => {
    couponRepositoryRead.findCouponById.mockResolvedValue(
      aCoupon({ usageLimit: 100 }),
    );

    await couponService.updateCoupon({
      ...COUPON_DATA,
      id: 'coupon-1',
      maxDiscountInCents: undefined,
    });

    expect(couponRepositoryWrite.updateCouponById).toHaveBeenCalledWith(
      'coupon-1',
      expect.objectContaining({
        unset: ['maxDiscountInCents', 'usageLimit'],
      }),
    );
  });
});

describe('When a customer validates a coupon', () => {
  const PARAMS = {
    code: 'desconto15',
    customerId: 'customer-1',
    subtotalInCents: 4000,
    deliveryFeeInCents: 500,
    fulfillmentType: EFulfillmentType.DELIVERY,
  };

  it('should return the discount preview', async () => {
    couponRepositoryRead.findCouponByCode.mockResolvedValue(aCoupon());

    const { discountInCents } =
      await couponService.validateCouponForCustomer(PARAMS);

    expect(discountInCents).toBe(600);
    expect(couponRepositoryRead.findCouponByCode).toHaveBeenCalledWith(
      'DESCONTO15',
    );
  });

  it('should reject an unknown code', async () => {
    await expect(
      couponService.validateCouponForCustomer(PARAMS),
    ).rejects.toMatchObject({ code: 'COUPON_NOT_FOUND' });
  });

  it('should count the uses of this customer (CPN-R05)', async () => {
    couponRepositoryRead.findCouponByCode.mockResolvedValue(aCoupon());
    customerCouponUsage.countCouponUsesByCustomer.mockResolvedValue(1);

    await expect(
      couponService.validateCouponForCustomer(PARAMS),
    ).rejects.toMatchObject({ code: 'COUPON_ALREADY_USED' });
    expect(customerCouponUsage.countCouponUsesByCustomer).toHaveBeenCalledWith(
      'customer-1',
      'coupon-1',
    );
  });
});

describe('When an order reserves a coupon use (CPN-R09)', () => {
  it('should throw COUPON_EXHAUSTED when the conditional increment fails', async () => {
    couponRepositoryWrite.incrementCouponUsage.mockResolvedValue(false);

    await expect(
      couponService.reserveCouponUse('coupon-1'),
    ).rejects.toMatchObject({ code: 'COUPON_EXHAUSTED' });
  });

  it('should release the use when the order is canceled', async () => {
    await couponService.releaseCouponUse('coupon-1');

    expect(couponRepositoryWrite.decrementCouponUsage).toHaveBeenCalledWith(
      'coupon-1',
    );
  });
});
