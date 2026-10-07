import {
  EOrderActorType,
  EOrderStatus,
} from '../../domain/order/interfaces/order.interface';
import { Mcounter } from '../../infrastructure/db/mongo/models/counter.model';
import { Morder } from '../../infrastructure/db/mongo/models/order.model';
import { MongoTransactionRunner } from '../../infrastructure/db/mongo/transaction';
import { CounterRepository } from '../../infrastructure/repository/counter/counter.repository';
import { OrderRepositoryWrite } from '../../infrastructure/repository/order/order.repository.write';
import { anOrderFixture } from '../helpers/order.fixtures';

const counterRepository = new CounterRepository();
const orderRepositoryWrite = new OrderRepositoryWrite();
const transactionRunner = new MongoTransactionRunner();

beforeAll(async () => {
  await Morder.syncIndexes();
  await Mcounter.syncIndexes();
});

beforeEach(async () => {
  await Promise.all([Morder.deleteMany({}), Mcounter.deleteMany({})]);
});

describe('When orders get sequential numbers', () => {
  it('should give unique sequential numbers to concurrent creates', async () => {
    const numbers = await Promise.all(
      Array.from({ length: 10 }, () =>
        transactionRunner.runInTransaction(async (context) => {
          const number = await counterRepository.nextValue('order', context);
          await orderRepositoryWrite.createOrder(
            anOrderFixture({ number }),
            context,
          );
          return number;
        }),
      ),
    );

    expect([...numbers].sort((a, b) => a - b)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it('should roll back the number and the order when the work fails', async () => {
    await expect(
      transactionRunner.runInTransaction(async (context) => {
        const number = await counterRepository.nextValue('order', context);
        await orderRepositoryWrite.createOrder(
          anOrderFixture({ number }),
          context,
        );
        throw new Error('payment failed');
      }),
    ).rejects.toThrow('payment failed');

    await expect(Morder.countDocuments()).resolves.toBe(0);
    await expect(counterRepository.nextValue('order')).resolves.toBe(1);
  });
});

describe('When we update the order status with a guard', () => {
  it('should update only when the current status matches', async () => {
    const order = await orderRepositoryWrite.createOrder(anOrderFixture());
    const entry = {
      status: EOrderStatus.PREPARING,
      at: new Date(),
      by: { type: EOrderActorType.STAFF, id: 'staff-1' },
    };

    const first = await orderRepositoryWrite.updateOrderStatus({
      id: order.id,
      from: EOrderStatus.PLACED,
      entry,
    });
    const second = await orderRepositoryWrite.updateOrderStatus({
      id: order.id,
      from: EOrderStatus.PLACED,
      entry,
    });

    expect(first?.status).toBe(EOrderStatus.PREPARING);
    expect(first?.statusHistory).toHaveLength(2);
    expect(second).toBeNull();
  });
});
