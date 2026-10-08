import { ECouponType } from '../../domain/coupon/interfaces/coupon.interface';
import { EOrderStatus } from '../../domain/order/interfaces/order.interface';
import { Morder } from '../../infrastructure/db/mongo/models/order.model';
import { OrderRepositoryRead } from '../../infrastructure/repository/order/order.repository.read';
import { OrderRepositoryWrite } from '../../infrastructure/repository/order/order.repository.write';
import { anOrderFixture } from '../helpers/order.fixtures';

const orderRepositoryRead = new OrderRepositoryRead();
const orderRepositoryWrite = new OrderRepositoryWrite();

beforeAll(async () => {
  await Morder.syncIndexes();
});

beforeEach(async () => {
  await Morder.deleteMany({});
});

describe('When we look up orders', () => {
  it('should find an order by idempotency key and reject duplicates (ORD-R11)', async () => {
    await orderRepositoryWrite.createOrder(
      anOrderFixture({ idempotencyKey: 'key-1' }),
    );

    const found = await orderRepositoryRead.findOrderByIdempotencyKey(
      'customer-1',
      'key-1',
    );

    expect(found?.idempotencyKey).toBe('key-1');
    await expect(
      orderRepositoryWrite.createOrder(
        anOrderFixture({ idempotencyKey: 'key-1' }),
      ),
    ).rejects.toThrow(/duplicate key/);
  });

  it('should count coupon uses and completed orders (CPN-R05, R06)', async () => {
    const coupon = {
      id: 'coupon-1',
      code: 'OFF10',
      type: ECouponType.FIXED,
      value: 10,
    };
    await orderRepositoryWrite.createOrder(anOrderFixture({ coupon }));
    await orderRepositoryWrite.createOrder(
      anOrderFixture({ coupon, status: EOrderStatus.CANCELED }),
    );
    await orderRepositoryWrite.createOrder(
      anOrderFixture({ status: EOrderStatus.COMPLETED }),
    );

    await expect(
      orderRepositoryRead.countCouponUsesByCustomer('customer-1', 'coupon-1'),
    ).resolves.toBe(1);
    await expect(
      orderRepositoryRead.hasCompletedOrder('customer-1', 'store-1'),
    ).resolves.toBe(true);
    await expect(
      orderRepositoryRead.hasCompletedOrder('customer-1', 'store-2'),
    ).resolves.toBe(false);
    await expect(
      orderRepositoryRead.hasCompletedOrder('other', 'store-1'),
    ).resolves.toBe(false);
  });

  it('should search by number or customer name and list active orders', async () => {
    await orderRepositoryWrite.createOrder(anOrderFixture({ number: 42 }));
    await orderRepositoryWrite.createOrder(
      anOrderFixture({
        customerSnapshot: { name: 'Robin', phone: '+5511988887777' },
        status: EOrderStatus.COMPLETED,
      }),
    );

    await orderRepositoryWrite.createOrder(
      anOrderFixture({ storeId: 'store-2', number: 42 }),
    );

    const byNumber = await orderRepositoryRead.searchOrders({
      storeId: 'store-1',
      search: '42',
      limit: 10,
      offset: 0,
    });
    const byName = await orderRepositoryRead.searchOrders({
      storeId: 'store-1',
      search: 'rob',
      limit: 10,
      offset: 0,
    });
    const active = await orderRepositoryRead.listActiveOrders('store-1');

    expect(byNumber.items.map(({ number }) => number)).toEqual([42]);
    expect(byName.total).toBe(1);
    expect(active).toHaveLength(1);
  });
});
