import { Socket } from 'socket.io-client';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { socketEmitter } from '../../infrastructure/realtime/socket.emitter';
import { setupCheckout } from '../helpers/checkout.helper';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';
import { as } from '../helpers/http.helper';
import {
  ISocketTestServer,
  startSocketTestServer,
  waitForEvent,
} from '../helpers/socket.helper';
import { StoreServiceFactory } from '../../infrastructure/config/factories/store.service.factory';
import { createStore, loginAs } from '../helpers/staff-session.helper';

let server: ISocketTestServer;
let checkout: Awaited<ReturnType<typeof setupCheckout>>;

function collect(client: Socket, event: string): unknown[] {
  const received: unknown[] = [];
  client.on(event, (payload) => received.push(payload));
  return received;
}

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

beforeEach(async () => {
  checkout = await setupCheckout();
  server = await startSocketTestServer();
  socketEmitter.attach(server.io);
});

afterEach(async () => {
  socketEmitter.detach();
  await server.close();
});

describe('When orders change in real time', () => {
  it('should notify staff of a Pix order only after the payment (BE-38)', async () => {
    const { accessToken } = await loginAs(EStaffRole.STAFF);
    const staff = await server.connectClient(accessToken);
    const created = collect(staff, 'order.created');

    const orderId = await placeOrder('PIX');
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(created).toHaveLength(0);

    const event = waitForEvent<{ orderId: string }>(staff, 'order.created');
    await as(checkout.accessToken).post(
      `/me/orders/${orderId}/payment/pix/simulate`,
    );

    await expect(event).resolves.toMatchObject({ orderId });
  });

  it("should not send customer A's events to customer B", async () => {
    const owner = await server.connectClient(checkout.accessToken);
    const other = await loginCustomerWithOtp();
    const otherClient = await server.connectClient(other.accessToken);
    const leaked = collect(otherClient, 'order.status_changed');
    const orderId = await placeOrder('CASH_ON_DELIVERY');
    const { accessToken: staffToken } = await loginAs(EStaffRole.STAFF);

    const event = waitForEvent<{ status: string }>(
      owner,
      'order.status_changed',
    );
    await as(staffToken)
      .patch(`/admin/orders/${orderId}/status`)
      .send({ status: 'PREPARING' });

    await expect(event).resolves.toMatchObject({
      orderId,
      status: 'PREPARING',
      previousStatus: 'PLACED',
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(leaked).toHaveLength(0);
  });

  it('should broadcast a sold-out product only to visitors of that store', async () => {
    const { slug } = await StoreServiceFactory.create().getStore(
      checkout.storeId,
    );
    const otherStore = await createStore('Pizza Boa');
    const visitor = await server.connectClient(undefined, slug);
    const otherVisitor = await server.connectClient(undefined, otherStore.slug);
    const leaked = collect(otherVisitor, 'product.availability_changed');
    const { accessToken } = await loginAs(EStaffRole.STAFF);

    const event = waitForEvent(visitor, 'product.availability_changed');
    await as(accessToken)
      .patch(`/admin/products/${checkout.smash.id}/availability`)
      .send({ isAvailable: false });

    await expect(event).resolves.toEqual({
      productId: checkout.smash.id,
      isAvailable: false,
    });
    expect(leaked).toHaveLength(0);
  });
});
