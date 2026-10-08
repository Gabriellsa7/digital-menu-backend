import {
  assertCartSize,
  buildOrderItems,
} from '../../domain/order/order-snapshot.factory';
import { ICartItem } from '../../domain/order/interfaces/order-pricing.service.interface';
import {
  aBreadGroupFixture,
  aProductFixture,
  anOptionGroupFixture,
} from '../helpers/catalog.fixtures';

const SMASH_WITH_BACON: ICartItem = {
  productId: 'smash',
  quantity: 2,
  options: [
    { groupId: 'bread', optionId: 'potato' },
    { groupId: 'extras', optionId: 'bacon', quantity: 2 },
  ],
  notes: ' sem cebola ',
};

function build(items: ICartItem[], products = [aProductFixture()]) {
  return buildOrderItems(
    items,
    products,
    [aBreadGroupFixture(), anOptionGroupFixture()],
    new Date('2026-10-01T12:00:00Z'),
  );
}

describe('When we build the order item snapshots (ORD-R07)', () => {
  it('should charge the active promotion and keep the list price (PRM-R02)', () => {
    const [item] = build(
      [
        {
          productId: 'smash',
          quantity: 1,
          options: [{ groupId: 'bread', optionId: 'brioche' }],
        },
      ],
      [
        aProductFixture({
          promotion: {
            priceInCents: 2500,
            startsAt: new Date('2026-09-01T00:00:00Z'),
            endsAt: new Date('2026-10-30T00:00:00Z'),
          },
        }),
      ],
    );

    expect(item).toMatchObject({
      listPriceInCents: 3000,
      unitPriceInCents: 2500,
    });
  });

  it('should price the item from the catalog, not from the client', () => {
    const [item] = build([SMASH_WITH_BACON]);

    expect(item).toEqual({
      productId: 'smash',
      name: 'Smash',
      unitPriceInCents: 3900,
      quantity: 2,
      options: [
        expect.objectContaining({ optionId: 'potato', groupName: 'Pão' }),
        expect.objectContaining({ optionId: 'bacon', quantity: 2 }),
      ],
      notes: 'sem cebola',
      totalInCents: 7800,
    });
  });
});

describe('When a cart item is invalid', () => {
  it.each([
    [
      'a sold-out product (ORD-R05)',
      [SMASH_WITH_BACON],
      [aProductFixture({ isAvailable: false })],
      'PRODUCT_UNAVAILABLE',
    ],
    [
      'an inactive product (ORD-R05)',
      [SMASH_WITH_BACON],
      [aProductFixture({ isActive: false })],
      'PRODUCT_UNAVAILABLE',
    ],
    [
      'an unknown product (ORD-R05)',
      [SMASH_WITH_BACON],
      [],
      'PRODUCT_UNAVAILABLE',
    ],
    [
      'a missing required group (ORD-R06)',
      [{ productId: 'smash', quantity: 1, options: [] }],
      undefined,
      'INVALID_OPTIONS',
    ],
    [
      'a sold-out option (ORD-R06)',
      [
        {
          ...SMASH_WITH_BACON,
          options: [
            { groupId: 'bread', optionId: 'brioche' },
            { groupId: 'extras', optionId: 'egg' },
          ],
        },
      ],
      undefined,
      'INVALID_OPTIONS',
    ],
    [
      'a repeat without allowRepeat (ORD-R06)',
      [
        {
          ...SMASH_WITH_BACON,
          options: [{ groupId: 'bread', optionId: 'brioche', quantity: 2 }],
        },
      ],
      undefined,
      'INVALID_OPTIONS',
    ],
    [
      'more selections than the maximum (ORD-R06)',
      [
        {
          ...SMASH_WITH_BACON,
          options: [
            { groupId: 'bread', optionId: 'brioche' },
            { groupId: 'extras', optionId: 'bacon', quantity: 4 },
          ],
        },
      ],
      undefined,
      'INVALID_OPTIONS',
    ],
    [
      'a group of another product (ORD-R06)',
      [
        {
          ...SMASH_WITH_BACON,
          options: [
            ...SMASH_WITH_BACON.options,
            { groupId: 'drinks', optionId: 'coke' },
          ],
        },
      ],
      undefined,
      'INVALID_OPTIONS',
    ],
  ])('should reject %s', (_case, items, products, code) => {
    expect(() => build(items, products)).toThrow(
      expect.objectContaining({ code }),
    );
  });
});

describe('When we check the cart size (ORD-R08)', () => {
  it.each([
    ['an empty cart', [], 'INVALID_CART_SIZE'],
    [
      'more than 50 lines',
      Array.from({ length: 51 }, () => SMASH_WITH_BACON),
      'INVALID_CART_SIZE',
    ],
    [
      'a quantity of 100',
      [{ ...SMASH_WITH_BACON, quantity: 100 }],
      'INVALID_QUANTITY',
    ],
    [
      'a quantity of 0',
      [{ ...SMASH_WITH_BACON, quantity: 0 }],
      'INVALID_QUANTITY',
    ],
  ])('should reject %s', (_case, items, code) => {
    expect(() => assertCartSize(items)).toThrow(
      expect.objectContaining({ code }),
    );
  });
});
