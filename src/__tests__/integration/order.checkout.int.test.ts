import { EManualStatus } from '../../domain/store/interfaces/store.interface';
import { ProductServiceFactory } from '../../infrastructure/config/factories/product.service.factory';
import { setupCheckout } from '../helpers/checkout.helper';
import { as } from '../helpers/http.helper';

let checkout: Awaited<ReturnType<typeof setupCheckout>>;

function aCart(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        productId: checkout.smash.id,
        quantity: 1,
        unitPriceInCents: 1,
        options: [
          {
            groupId: checkout.extras.id,
            optionId: checkout.extras.options[0].id,
          },
        ],
      },
    ],
    fulfillmentType: 'DELIVERY',
    addressId: checkout.address.id,
    paymentMethod: 'CASH_ON_DELIVERY',
    ...overrides,
  };
}

beforeEach(async () => {
  checkout = await setupCheckout();
});

describe('When a customer quotes a cart', () => {
  it('should price it on the server, ignoring client prices (ORD-R07)', async () => {
    const { body, statusCode } = await as(checkout.accessToken)
      .post('/me/orders/quote')
      .send(aCart());

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      subtotalInCents: 3400,
      deliveryFeeInCents: 790,
      totalInCents: 4190,
      etaMinMinutes: 30,
      deliveryZone: { name: 'Vila Mariana' },
    });
  });
});

describe('When a customer places an order', () => {
  it('should create a delivery order paid on delivery as PLACED', async () => {
    const { body, statusCode } = await as(checkout.accessToken)
      .post('/me/orders')
      .send(aCart({ notes: 'Portão azul' }));

    expect(statusCode).toBe(201);
    expect(body).toMatchObject({
      number: expect.any(Number),
      status: 'PLACED',
      totalInCents: 4190,
      customerSnapshot: { name: 'Nami', phone: checkout.phone },
      payment: { method: 'CASH_ON_DELIVERY', status: 'ON_DELIVERY' },
      notes: 'Portão azul',
    });
  });

  it('should create a pickup order paid by Pix as AWAITING_PAYMENT', async () => {
    const { body } = await as(checkout.accessToken)
      .post('/me/orders')
      .send(
        aCart({
          fulfillmentType: 'PICKUP',
          addressId: undefined,
          paymentMethod: 'PIX',
        }),
      );

    expect(body).toMatchObject({
      status: 'AWAITING_PAYMENT',
      deliveryFeeInCents: 0,
      payment: { status: 'PENDING' },
    });
  });

  it('should return the same order for a retried Idempotency-Key (ORD-R11)', async () => {
    const place = () =>
      as(checkout.accessToken)
        .post('/me/orders')
        .set('Idempotency-Key', 'checkout-key-1')
        .send(aCart());

    const first = await place();
    const second = await place();

    expect(second.statusCode).toBe(201);
    expect(second.body.id).toBe(first.body.id);
  });

  it.each([
    [
      'the store is closed (ORD-R01)',
      async () =>
        checkout.storeService.setManualStatus(EManualStatus.FORCED_CLOSED),
      {},
      'STORE_CLOSED',
    ],
    [
      'the subtotal is below the minimum (ORD-R04)',
      async () =>
        checkout.storeService.updateStore({ minimumOrderInCents: 5000 }),
      {},
      'BELOW_MINIMUM_ORDER',
    ],
    [
      'the product is sold out (ORD-R05)',
      async () =>
        ProductServiceFactory.create().setProductAvailability({
          id: checkout.smash.id,
          isAvailable: false,
        }),
      {},
      'PRODUCT_UNAVAILABLE',
    ],
    [
      'the change is below the total (ORD-R09)',
      async () => undefined,
      { changeForInCents: 4000 },
      'INVALID_CHANGE',
    ],
  ])('should answer 422 when %s', async (_case, arrange, overrides, code) => {
    await arrange();

    const { body, statusCode } = await as(checkout.accessToken)
      .post('/me/orders')
      .send(aCart(overrides));

    expect(statusCode).toBe(422);
    expect(body.code).toBe(code);
  });
});
