import { EOrderStatus } from '../../domain/order/interfaces/order.interface';
import { Morder } from '../../infrastructure/db/mongo/models/order.model';
import { setupCheckout } from '../helpers/checkout.helper';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';
import { as } from '../helpers/http.helper';

let checkout: Awaited<ReturnType<typeof setupCheckout>>;

async function placeOrder() {
  const { body } = await as(checkout.accessToken)
    .post('/me/orders')
    .send({
      items: [{ productId: checkout.smash.id, quantity: 1 }],
      fulfillmentType: 'PICKUP',
      paymentMethod: 'CASH_ON_DELIVERY',
    });
  return body.id as string;
}

beforeEach(async () => {
  checkout = await setupCheckout();
});

describe('When a customer reads the order history', () => {
  it('should list the own orders, newest first, with pagination', async () => {
    const first = await placeOrder();
    const second = await placeOrder();
    await placeOrder();

    const page = await as(checkout.accessToken)
      .get('/me/orders')
      .query({ page: 2, limit: 2 });
    const detail = await as(checkout.accessToken).get(`/me/orders/${second}`);

    expect(page.body).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(page.body.items.map(({ id }: { id: string }) => id)).toEqual([
      first,
    ]);
    expect(detail.body).toMatchObject({
      id: second,
      statusHistory: [{ status: 'PLACED' }],
    });
  });

  it("should answer 404 for another customer's order (ORD-R18)", async () => {
    const orderId = await placeOrder();
    const intruder = await loginCustomerWithOtp();

    const { statusCode } = await as(intruder.accessToken).get(
      `/me/orders/${orderId}`,
    );

    expect(statusCode).toBe(404);
  });
});

describe('When a customer cancels an order', () => {
  it('should cancel a placed order (ORD-R15)', async () => {
    const orderId = await placeOrder();

    const { body, statusCode } = await as(checkout.accessToken)
      .post(`/me/orders/${orderId}/cancel`)
      .send({ reason: 'Pedi errado' });

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      status: 'CANCELED',
      cancelReason: 'Pedi errado',
    });
  });

  it('should answer 422 CANNOT_CANCEL after PREPARING (ORD-R15)', async () => {
    const orderId = await placeOrder();
    await Morder.updateOne(
      { id: orderId },
      { $set: { status: EOrderStatus.PREPARING } },
    );

    const { body, statusCode } = await as(checkout.accessToken)
      .post(`/me/orders/${orderId}/cancel`)
      .send({});

    expect(statusCode).toBe(422);
    expect(body.code).toBe('CANNOT_CANCEL');
  });
});
