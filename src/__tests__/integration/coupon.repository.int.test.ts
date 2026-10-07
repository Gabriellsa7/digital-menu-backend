import { randomUUID } from 'crypto';
import { ECouponType } from '../../domain/coupon/interfaces/coupon.interface';
import { Mcoupon } from '../../infrastructure/db/mongo/models/coupon.model';
import { CouponRepositoryWrite } from '../../infrastructure/repository/coupon/coupon.repository.write';

const couponRepositoryWrite = new CouponRepositoryWrite();

function createCoupon(usageLimit?: number) {
  const now = new Date();
  return couponRepositoryWrite.createCoupon({
    id: randomUUID(),
    code: `C${randomUUID().slice(0, 8).toUpperCase()}`,
    type: ECouponType.FIXED,
    value: 500,
    minOrderInCents: 0,
    startsAt: now,
    expiresAt: new Date(now.getTime() + 86_400_000),
    ...(usageLimit !== undefined && { usageLimit }),
    usagePerCustomer: 1,
    usedCount: 0,
    firstOrderOnly: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

beforeEach(async () => {
  await Mcoupon.deleteMany({});
});

describe('When orders use a limited coupon concurrently (CPN-R09)', () => {
  it('should never go above the usage limit', async () => {
    const coupon = await createCoupon(3);

    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        couponRepositoryWrite.incrementCouponUsage(coupon.id),
      ),
    );

    expect(results.filter(Boolean)).toHaveLength(3);
    const stored = await Mcoupon.findOne({ id: coupon.id }).lean();
    expect(stored?.usedCount).toBe(3);
  });

  it('should increment an unlimited coupon and never decrement below 0', async () => {
    const coupon = await createCoupon();

    await expect(
      couponRepositoryWrite.incrementCouponUsage(coupon.id),
    ).resolves.toBe(true);
    await couponRepositoryWrite.decrementCouponUsage(coupon.id);
    await couponRepositoryWrite.decrementCouponUsage(coupon.id);

    const stored = await Mcoupon.findOne({ id: coupon.id }).lean();
    expect(stored?.usedCount).toBe(0);
  });
});
