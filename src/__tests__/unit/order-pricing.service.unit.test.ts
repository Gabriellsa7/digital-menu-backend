import { OrderPricingService } from '../../domain/order/service/order-pricing.service';
import { IParamsQuoteOrder } from '../../domain/order/interfaces/order-pricing.service.interface';
import { EFulfillmentType } from '../../domain/order/interfaces/order.interface';
import { EPaymentMethod } from '../../domain/payment/interfaces/payment.interface';
import { IStoreService } from '../../domain/store/interfaces/store.service.interface';
import { ICustomerService } from '../../domain/customer/interfaces/customer.service.interface';
import { IDeliveryZoneService } from '../../domain/delivery-zone/interfaces/delivery-zone.service.interface';
import { IProductService } from '../../domain/product/interfaces/product.service.interface';
import { IOptionGroupService } from '../../domain/option-group/interfaces/option-group.service.interface';
import { ICouponService } from '../../domain/coupon/interfaces/coupon.service.interface';
import { BusinessRuleError } from '../../domain/errors/business-rule.error';
import { NotFoundError } from '../../domain/errors/not-found.error';
import {
  aBreadGroupFixture,
  aCouponFixture,
  aCustomerFixture,
  aDeliveryZoneFixture,
  aProductFixture,
  aStoreFixture,
  anOptionGroupFixture,
} from '../helpers/catalog.fixtures';

const SMASH_WITH_BACON = {
  productId: 'smash',
  quantity: 2,
  options: [
    { groupId: 'bread', optionId: 'potato' },
    { groupId: 'extras', optionId: 'bacon', quantity: 2 },
  ],
};

function aQuote(overrides: Partial<IParamsQuoteOrder> = {}): IParamsQuoteOrder {
  return {
    storeId: 'store-1',
    customerId: 'customer-1',
    items: [SMASH_WITH_BACON],
    fulfillmentType: EFulfillmentType.DELIVERY,
    addressId: 'home',
    paymentMethod: EPaymentMethod.PIX,
    ...overrides,
  };
}

const storeService = { assertAcceptingOrders: jest.fn() };
const customerService = { getCustomerById: jest.fn() };
const deliveryZoneService = { getDeliveryZoneById: jest.fn() };
const productService = { findProductsByIds: jest.fn() };
const optionGroupService = { findOptionGroupsByIds: jest.fn() };
const couponService = { validateCouponForCustomer: jest.fn() };

const orderPricingService = new OrderPricingService({
  storeService: storeService as unknown as IStoreService,
  customerService: customerService as unknown as ICustomerService,
  deliveryZoneService: deliveryZoneService as unknown as IDeliveryZoneService,
  productService: productService as unknown as IProductService,
  optionGroupService: optionGroupService as unknown as IOptionGroupService,
  couponService: couponService as unknown as ICouponService,
});

beforeEach(() => {
  storeService.assertAcceptingOrders.mockResolvedValue(aStoreFixture());

  customerService.getCustomerById.mockResolvedValue(aCustomerFixture());
  deliveryZoneService.getDeliveryZoneById.mockResolvedValue(
    aDeliveryZoneFixture(),
  );
  productService.findProductsByIds.mockResolvedValue([aProductFixture()]);
  optionGroupService.findOptionGroupsByIds.mockResolvedValue([
    aBreadGroupFixture(),
    anOptionGroupFixture(),
  ]);
  couponService.validateCouponForCustomer.mockResolvedValue({
    coupon: aCouponFixture(),
    discountInCents: 790,
  });
});

describe('When we quote a valid cart', () => {
  it('should price items, fee and total on the server (ORD-R07)', async () => {
    const quote = await orderPricingService.quoteOrder(aQuote());

    expect(quote.items[0]).toMatchObject({
      unitPriceInCents: 3900,
      quantity: 2,
      totalInCents: 7800,
    });
    expect(quote).toMatchObject({
      subtotalInCents: 7800,
      deliveryFeeInCents: 790,
      discountInCents: 0,
      totalInCents: 8590,
      deliveryZone: { id: 'zone-1', name: 'Vila Mariana', feeInCents: 790 },
      deliveryAddress: { street: 'Rua Vergueiro' },
      etaMinMinutes: 30,
    });
    expect(quote.deliveryAddress).not.toHaveProperty('label');
  });

  it('should apply a coupon discount (CPN-R07)', async () => {
    const quote = await orderPricingService.quoteOrder(
      aQuote({ couponCode: 'fretegratis' }),
    );

    expect(quote).toMatchObject({
      discountInCents: 790,
      totalInCents: 7800,
      coupon: { code: 'FRETEGRATIS' },
    });
  });

  it('should charge no fee and no minimum for pickup', async () => {
    const quote = await orderPricingService.quoteOrder(
      aQuote({
        fulfillmentType: EFulfillmentType.PICKUP,
        addressId: undefined,
        items: [
          {
            productId: 'smash',
            quantity: 1,
            options: [{ groupId: 'bread', optionId: 'brioche' }],
          },
        ],
      }),
    );

    expect(quote).toMatchObject({
      subtotalInCents: 3000,
      deliveryFeeInCents: 0,
      totalInCents: 3000,
      etaMinMinutes: 20,
    });
  });
});

describe('When a quote breaks a rule', () => {
  it.each([
    [
      'the store is closed (ORD-R01)',
      () =>
        storeService.assertAcceptingOrders.mockRejectedValue(
          new BusinessRuleError('Store is closed', 'STORE_CLOSED'),
        ),
      {},
      'STORE_CLOSED',
    ],
    [
      'delivery is disabled (ORD-R02)',
      () =>
        storeService.assertAcceptingOrders.mockResolvedValue(
          aStoreFixture({ deliveryEnabled: false }),
        ),
      {},
      'FULFILLMENT_UNAVAILABLE',
    ],
    ['there is no address', () => undefined, { addressId: undefined }, 'ADDRESS_REQUIRED'],
    [
      'the address is not served (ORD-R03)',
      () =>
        customerService.getCustomerById.mockResolvedValue(
          aCustomerFixture({
            addresses: [
              { ...aCustomerFixture().addresses[0], deliveryZoneId: undefined },
            ],
          }),
        ),
      {},
      'ADDRESS_NOT_SERVED',
    ],
    [
      'the zone was deactivated (ORD-R03)',
      () =>
        deliveryZoneService.getDeliveryZoneById.mockResolvedValue(
          aDeliveryZoneFixture({ isActive: false }),
        ),
      {},
      'ADDRESS_NOT_SERVED',
    ],
    [
      'the zone was deleted (ORD-R03)',
      () =>
        deliveryZoneService.getDeliveryZoneById.mockRejectedValue(
          new NotFoundError(),
        ),
      {},
      'ADDRESS_NOT_SERVED',
    ],
    [
      'the subtotal is below the minimum (ORD-R04)',
      () =>
        storeService.assertAcceptingOrders.mockResolvedValue(
          aStoreFixture({ minimumOrderInCents: 10000 }),
        ),
      {},
      'BELOW_MINIMUM_ORDER',
    ],
    [
      'an item is invalid (ORD-R05)',
      () => productService.findProductsByIds.mockResolvedValue([]),
      {},
      'PRODUCT_UNAVAILABLE',
    ],
    [
      'the change is not above the total (ORD-R09)',
      () => undefined,
      {
        paymentMethod: EPaymentMethod.CASH_ON_DELIVERY,
        changeForInCents: 8590,
      },
      'INVALID_CHANGE',
    ],
    [
      'change is asked for a non-cash payment (ORD-R09)',
      () => undefined,
      { changeForInCents: 10000 },
      'INVALID_CHANGE',
    ],
  ])('should reject when %s', async (_case, arrange, overrides, code) => {
    arrange();

    await expect(
      orderPricingService.quoteOrder(aQuote(overrides)),
    ).rejects.toMatchObject({ code });
  });

  it('should accept change above the total for cash (ORD-R09)', async () => {
    await expect(
      orderPricingService.quoteOrder(
        aQuote({
          paymentMethod: EPaymentMethod.CASH_ON_DELIVERY,
          changeForInCents: 10000,
        }),
      ),
    ).resolves.toMatchObject({ totalInCents: 8590 });
  });
});
