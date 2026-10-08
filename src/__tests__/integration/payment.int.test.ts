import { Morder } from '../../infrastructure/db/mongo/models/order.model';
import { setupCheckout } from '../helpers/checkout.helper';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';
import { as } from '../helpers/http.helper';

const CARD = { holder: 'NAMI', expiry: '12/30', cvv: '123' };

let checkout: Awaited<ReturnType<typeof setupCheckout>>;

async function placeOrder(paymentMethod: string) {
  const { body } = await as(checkout.accessToken)
    .post('/me/orders')
    .send({
      storeId: checkout.storeId,
      items: [{ productId: checkout.smash.id, quantity: 1 }],
      fulfillmentType: 'PICKUP',
      paymentMethod,
    });
  return body.id as string;
}

function payWithCard(orderId: string, number: string) {
  return as(checkout.accessToken)
    .post(`/me/orders/${orderId}/payment/card`)
    .send({ ...CARD, number });
}

beforeEach(async () => {
  checkout = await setupCheckout();
});

describe('When a customer pays with a card', () => {
  it('should place the order and never persist the card number (PAY-R03)', async () => {
    const orderId = await placeOrder('CARD_ONLINE');

    const { body, statusCode } = await payWithCard(
      orderId,
      '4242 4242 4242 4242',
    );

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      status: 'PLACED',
      payment: { status: 'APPROVED', card: { brand: 'VISA', last4: '4242' } },
    });
    const stored = await Morder.findOne({ id: orderId }).lean();
    expect(JSON.stringify(stored)).not.toContain('4242424242424242');
    expect(JSON.stringify(stored)).not.toContain('"cvv"');
  });

  it('should cancel the order after 3 declined attempts (PAY-R05)', async () => {
    const orderId = await placeOrder('CARD_ONLINE');

    const first = await payWithCard(orderId, '4000 0000 0000 0002');
    await payWithCard(orderId, '4000 0000 0000 0002');
    const third = await payWithCard(orderId, '4000 0000 0000 0002');
    const afterCancel = await payWithCard(orderId, '4242 4242 4242 4242');

    expect(first.statusCode).toBe(422);
    expect(first.body).toMatchObject({
      code: 'CARD_DECLINED',
      details: { attemptsLeft: 2 },
    });
    expect(third.body.details.attemptsLeft).toBe(0);
    expect(afterCancel.body.code).toBe('PAYMENT_NOT_ALLOWED');
    const stored = await Morder.findOne({ id: orderId }).lean();
    expect(stored?.status).toBe('CANCELED');
  });
});

describe('When a customer pays with Pix', () => {
  it('should return the QR code and approve it on simulate (PAY-R01, R02)', async () => {
    const { body: order } = await as(checkout.accessToken)
      .post('/me/orders')
      .send({
        storeId: checkout.storeId,
        items: [{ productId: checkout.smash.id, quantity: 1 }],
        fulfillmentType: 'PICKUP',
        paymentMethod: 'PIX',
      });

    const { body, statusCode } = await as(checkout.accessToken).post(
      `/me/orders/${order.id}/payment/pix/simulate`,
    );

    expect(order.payment.pix).toMatchObject({
      copyPaste: expect.any(String),
      qrCodeBase64: expect.any(String),
      expiresAt: expect.any(String),
    });
    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      status: 'PLACED',
      payment: { status: 'APPROVED', paidAt: expect.any(String) },
    });
  });

  it("should answer 404 for another customer's order (ORD-R18)", async () => {
    const orderId = await placeOrder('PIX');
    const intruder = await loginCustomerWithOtp();

    const { statusCode } = await as(intruder.accessToken).post(
      `/me/orders/${orderId}/payment/pix/simulate`,
    );

    expect(statusCode).toBe(404);
  });
});
