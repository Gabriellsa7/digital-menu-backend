import { OrderTransitionService } from '../../domain/order/service/order-transition.service';
import { IOrderRepositoryWrite } from '../../domain/order/repository/order.repository.write';
import { ICouponService } from '../../domain/coupon/interfaces/coupon.service.interface';
import { IOrderEventPublisher } from '../../domain/order/events/order.event.publisher';
import { IStoreEventPublisher } from '../../domain/store/events/store.event.publisher';
import {
  EOrderActorType,
  EOrderStatus,
} from '../../domain/order/interfaces/order.interface';
import {
  EManualStatus,
  IStoreStatus,
} from '../../domain/store/interfaces/store.interface';
import { IStoreService } from '../../domain/store/interfaces/store.service.interface';
import {
  EPaymentMethod,
  EPaymentStatus,
} from '../../domain/payment/interfaces/payment.interface';
import { MockPaymentGateway } from '../../infrastructure/payment/mock.payment.gateway';
import { SocketEmitter } from '../../infrastructure/realtime/socket.emitter';
import { SocketOrderPublisher } from '../../infrastructure/realtime/socket.order.publisher';
import { StoreStatusJob } from '../../infrastructure/jobs/store-status.job';
import { anOrderFixture } from '../helpers/order.fixtures';
import { FixedClock } from '../helpers/fixed.clock';

function anOrderEventPublisher(): jest.Mocked<IOrderEventPublisher> {
  return {
    publishOrderCreated: jest.fn(),
    publishOrderStatusChanged: jest.fn(),
    publishOrderPaymentUpdated: jest.fn(),
  };
}

function aTransitionService(orderEventPublisher: IOrderEventPublisher) {
  const orderRepositoryWrite = {
    updateOrderStatus: jest.fn(async ({ id, entry, set }) =>
      anOrderFixture({ id, status: entry.status, ...set }),
    ),
  } as unknown as IOrderRepositoryWrite;
  return new OrderTransitionService({
    orderRepositoryWrite,
    couponService: {} as ICouponService,
    paymentGateway: new MockPaymentGateway(),
    transactionRunner: { runInTransaction: (work) => work(undefined) },
    orderEventPublisher,
    clock: new FixedClock(),
  });
}

describe('When an order changes status (ORD-R17)', () => {
  it('should publish status_changed, and created when it becomes PLACED', async () => {
    const publisher = anOrderEventPublisher();
    const order = anOrderFixture({
      status: EOrderStatus.AWAITING_PAYMENT,
      payment: {
        method: EPaymentMethod.PIX,
        status: EPaymentStatus.PENDING,
        failedAttempts: 0,
      },
    });

    await aTransitionService(publisher).transitionOrder({
      order,
      to: EOrderStatus.PLACED,
      actor: { type: EOrderActorType.SYSTEM },
      set: { payment: { ...order.payment, status: EPaymentStatus.APPROVED } },
    });

    expect(publisher.publishOrderStatusChanged).toHaveBeenCalledWith(
      expect.objectContaining({ status: EOrderStatus.PLACED }),
      EOrderStatus.AWAITING_PAYMENT,
    );
    expect(publisher.publishOrderPaymentUpdated).toHaveBeenCalled();
    expect(publisher.publishOrderCreated).toHaveBeenCalled();
  });

  it('should not publish created for other transitions', async () => {
    const publisher = anOrderEventPublisher();

    await aTransitionService(publisher).transitionOrder({
      order: anOrderFixture({ status: EOrderStatus.PLACED }),
      to: EOrderStatus.PREPARING,
      actor: { type: EOrderActorType.STAFF, id: 'staff-1' },
    });

    expect(publisher.publishOrderStatusChanged).toHaveBeenCalled();
    expect(publisher.publishOrderCreated).not.toHaveBeenCalled();
    expect(publisher.publishOrderPaymentUpdated).not.toHaveBeenCalled();
  });
});

describe('When the socket publisher emits order events', () => {
  it('should send status changes to the staff room and the customer room only', () => {
    const emitter = { emit: jest.fn() } as unknown as jest.Mocked<SocketEmitter>;
    const order = anOrderFixture({
      customerId: 'customer-9',
      status: EOrderStatus.PREPARING,
    });

    new SocketOrderPublisher(emitter).publishOrderStatusChanged(
      order,
      EOrderStatus.PLACED,
    );
    new SocketOrderPublisher(emitter).publishOrderCreated(order);

    expect(emitter.emit).toHaveBeenNthCalledWith(
      1,
      ['store:store-1:staff', 'customer:customer-9'],
      'order.status_changed',
      expect.objectContaining({
        orderId: order.id,
        status: EOrderStatus.PREPARING,
        previousStatus: EOrderStatus.PLACED,
      }),
    );
    expect(emitter.emit).toHaveBeenNthCalledWith(
      2,
      ['store:store-1:staff'],
      'order.created',
      expect.objectContaining({ itemsCount: 1 }),
    );
  });
});

describe('When the store status job ticks (STO-R05)', () => {
  function aStatus(isOpenNow: boolean, manualStatus = EManualStatus.AUTO) {
    return { isOpenNow, manualStatus } as IStoreStatus;
  }

  it('should publish only when the status of a store flips', async () => {
    const statuses: Record<string, IStoreStatus[]> = {
      'store-a': [aStatus(false), aStatus(false), aStatus(true)],
      'store-b': [aStatus(true), aStatus(true), aStatus(true)],
    };
    const refreshStoreStatus = jest.fn(async (storeId: string) =>
      statuses[storeId].shift(),
    );
    const listActiveStores = jest
      .fn()
      .mockResolvedValue([{ id: 'store-a' }, { id: 'store-b' }]);
    const publisher = {
      publishStoreStatusChanged: jest.fn(),
    } as unknown as jest.Mocked<IStoreEventPublisher>;
    const job = new StoreStatusJob(
      { refreshStoreStatus, listActiveStores } as unknown as IStoreService,
      publisher,
    );

    await job.run();
    await job.run();
    await job.run();

    expect(refreshStoreStatus).toHaveBeenCalledTimes(6);
    expect(publisher.publishStoreStatusChanged).toHaveBeenCalledTimes(1);
    expect(publisher.publishStoreStatusChanged).toHaveBeenCalledWith(
      'store-a',
      aStatus(true),
    );
  });
});
