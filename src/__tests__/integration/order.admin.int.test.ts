import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { setupCheckout } from '../helpers/checkout.helper';
import { as } from '../helpers/http.helper';
import { loginAs } from '../helpers/staff-session.helper';

let checkout: Awaited<ReturnType<typeof setupCheckout>>;
let staffToken: string;

async function placeOrder(fulfillmentType: 'DELIVERY' | 'PICKUP') {
  const { body } = await as(checkout.accessToken)
    .post('/me/orders')
    .send({
      items: [{ productId: checkout.smash.id, quantity: 1 }],
      fulfillmentType,
      ...(fulfillmentType === 'DELIVERY' && {
        addressId: checkout.address.id,
      }),
      paymentMethod: 'CASH_ON_DELIVERY',
    });
  return body.id as string;
}

function moveTo(orderId: string, status: string, estimatedMinutes?: number) {
  return as(staffToken)
    .patch(`/admin/orders/${orderId}/status`)
    .send({ status, ...(estimatedMinutes && { estimatedMinutes }) });
}

beforeEach(async () => {
  checkout = await setupCheckout();
  ({ accessToken: staffToken } = await loginAs(EStaffRole.STAFF));
});

describe('When staff runs the delivery lifecycle (ORD-R13, R17)', () => {
  it('should take an order from PLACED to COMPLETED', async () => {
    const orderId = await placeOrder('DELIVERY');

    const accepted = await moveTo(orderId, 'PREPARING', 25);
    await moveTo(orderId, 'READY');
    await moveTo(orderId, 'OUT_FOR_DELIVERY');
    const completed = await moveTo(orderId, 'COMPLETED');

    expect(accepted.body.estimatedReadyAt).toEqual(expect.any(String));
    expect(completed.statusCode).toBe(200);
    expect(
      completed.body.statusHistory.map(({ status }: { status: string }) => status),
    ).toEqual(['PLACED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'COMPLETED']);
    expect(completed.body.statusHistory[1].by.type).toBe('STAFF');
  });
});

describe('When staff runs the pickup lifecycle', () => {
  it('should complete from READY and refuse OUT_FOR_DELIVERY (ORD-R13)', async () => {
    const orderId = await placeOrder('PICKUP');
    await moveTo(orderId, 'PREPARING');
    await moveTo(orderId, 'READY');

    const outForDelivery = await moveTo(orderId, 'OUT_FOR_DELIVERY');
    const completed = await moveTo(orderId, 'COMPLETED');

    expect(outForDelivery.statusCode).toBe(422);
    expect(outForDelivery.body.code).toBe('INVALID_STATUS_TRANSITION');
    expect(completed.body.status).toBe('COMPLETED');
  });
});

describe('When staff rejects or cancels orders (ORD-R14)', () => {
  it('should reject a placed order with a reason', async () => {
    const orderId = await placeOrder('PICKUP');

    const { body } = await as(staffToken)
      .post(`/admin/orders/${orderId}/reject`)
      .send({ reason: 'Acabou o pão' });

    expect(body).toMatchObject({
      status: 'REJECTED',
      cancelReason: 'Acabou o pão',
    });
  });

  it('should refuse to cancel a placed order (it must be rejected)', async () => {
    const orderId = await placeOrder('PICKUP');

    const { body, statusCode } = await as(staffToken)
      .post(`/admin/orders/${orderId}/cancel`)
      .send({ reason: 'Teste' });

    expect(statusCode).toBe(422);
    expect(body.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('should answer 409 when two staff accept the same order', async () => {
    const orderId = await placeOrder('PICKUP');

    const results = await Promise.all([
      moveTo(orderId, 'PREPARING'),
      moveTo(orderId, 'PREPARING'),
    ]);

    const [winner, loser] = results
      .map(({ statusCode }) => statusCode)
      .sort((x, y) => x - y);
    expect(winner).toBe(200);
    expect([409, 422]).toContain(loser);
  });
});

describe('When staff reads the board', () => {
  it('should list active orders and search by number', async () => {
    const active = await placeOrder('PICKUP');
    const rejected = await placeOrder('PICKUP');
    await as(staffToken)
      .post(`/admin/orders/${rejected}/reject`)
      .send({ reason: 'Fechando' });
    const { body: detail } = await as(staffToken).get(
      `/admin/orders/${active}`,
    );

    const board = await as(staffToken).get('/admin/orders/active');
    const search = await as(staffToken)
      .get('/admin/orders')
      .query({ search: String(detail.number) });

    expect(board.body.map(({ id }: { id: string }) => id)).toEqual([active]);
    expect(search.body.items[0]).toMatchObject({
      id: active,
      customerName: 'Nami',
    });
  });
});
