import {
  activePromotion,
  assertValidPromotion,
  discountPercent,
  effectivePriceInCents,
  isNewProduct,
} from '../../domain/product/product-pricing';

const PROMOTION = {
  priceInCents: 2500,
  startsAt: new Date('2026-10-01T00:00:00Z'),
  endsAt: new Date('2026-10-10T00:00:00Z'),
};
const PRODUCT = { priceInCents: 3290, promotion: PROMOTION };

describe('When we price a product on promotion (PRM-R02, R03)', () => {
  it.each([
    ['before it starts', '2026-09-30T23:59:59Z', 3290],
    ['while it runs', '2026-10-05T12:00:00Z', 2500],
    ['once it ends', '2026-10-10T00:00:00Z', 3290],
  ])('should use the right price %s', (_case, now, expected) => {
    expect(effectivePriceInCents(PRODUCT, new Date(now))).toBe(expected);
  });

  it('should ignore a product without promotion', () => {
    expect(activePromotion({}, new Date())).toBeUndefined();
  });

  it('should round the discount percent', () => {
    expect(discountPercent(3290, PROMOTION)).toBe(24);
  });

  it('should flag products created in the last 14 days as new (HOM-R04)', () => {
    const now = new Date('2026-10-15T00:00:00Z');

    expect(
      isNewProduct({ createdAt: new Date('2026-10-02T00:00:00Z') }, now),
    ).toBe(true);
    expect(
      isNewProduct({ createdAt: new Date('2026-09-30T00:00:00Z') }, now),
    ).toBe(false);
  });
});

describe('When we validate a promotion (PRM-R01)', () => {
  it.each([
    ['equal to the price', { priceInCents: 3290 }, 'INVALID_PROMOTION_PRICE'],
    ['zero', { priceInCents: 0 }, 'INVALID_PROMOTION_PRICE'],
    [
      'ending before it starts',
      { endsAt: new Date('2026-09-01T00:00:00Z') },
      'INVALID_PROMOTION_PERIOD',
    ],
    [
      'longer than 60 days',
      { endsAt: new Date('2026-12-31T00:00:00Z') },
      'INVALID_PROMOTION_PERIOD',
    ],
  ])('should reject a promotion %s', (_case, overrides, code) => {
    expect(() =>
      assertValidPromotion(3290, { ...PROMOTION, ...overrides }),
    ).toThrow(expect.objectContaining({ code }));
  });

  it('should accept a valid promotion', () => {
    expect(() => assertValidPromotion(3290, PROMOTION)).not.toThrow();
  });
});
