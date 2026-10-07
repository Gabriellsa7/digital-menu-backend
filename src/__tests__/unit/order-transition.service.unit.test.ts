import { OrderTransitionService } from '../../domain/order/service/order-transition.service';
import { IOrderRepositoryWrite } from '../../domain/order/repository/order.repository.write';
import { ICouponService } from '../../domain/coupon/interfaces/coupon.service.interface';
import { ECouponType } from '../../domain/coupon/interfaces/coupon.interface';
import { IPaymentGateway } from '../../domain/payment/interfaces/payment.gateway.interface';
import {
  EOrderActorType,
  EOrderStatus,
} from '../../domain/order/interfaces/order.interface';
import {
  EPaymentMethod,
  EPaymentStatus,
} from '../../domain/payment/interfaces/payment.interface';
import { ConflictError } from '../../domain/errors/conflict.error';
import { anOrderFixture } from '../helpers/order.fixtures';
import { FixedClock } from '../helpers/fixed.clock';

const COUPON = {
  id: 'coupon-1',
  code: 'OFF10',
  type: ECouponType.FIXED,
  value: 1000,
};
const STAFF = { type: EOrderActorType.STAFF, id: 'staff-1' };
const APPROVED_PIX = {
  method: EPaymentMethod.PIX,
  status: EPaymentStatus.APPROVED,
  failedAttempts: 0,
  transactionId: 'pix_1',
};

let orderRepositoryWrite: jest.Mocked<IOrderRepositoryWrite>;
let couponService: jest.Mocked<
  Pick<ICouponService, 'reserveCouponUse' | 'releaseCouponUse'>
>;
let paymentGateway: jest.Mocked<IPaymentGateway>;
let transitionService: OrderTransitionService;

beforeEach(() => {
  orderRepositoryWrite = {
    createOrder: jest.fn(),
    updateOrderStatus: jest.fn(async ({ id, entry, set }) =>
      anOrderFixture({ id, status: entry.status, ...set }),
    ),
    updateOrderPayment: jest.fn(),
  };
  couponService = { reserveCouponUse: jest.fn(), releaseCouponUse: jest.fn() };
  paymentGateway = {
    createPixCharge: jest.fn(),
    chargeCard: jest.fn(),
    refund: jest.fn(),
  };
  transitionService = new OrderTransitionService({
    orderRepositoryWrite,
    couponService: couponService as unknown as ICouponService,
    paymentGateway,
    transactionRunner: { runInTransaction: (work) => work('tx') },
    orderEventPublisher: {
      publishOrderCreated: jest.fn(),
      publishOrderStatusChanged: jest.fn(),
      publishOrderPaymentUpdated: jest.fn(),
    },
    clock: new FixedClock(),
  });
});

describe('When staff moves an order forward (ORD-R13, R17)', () => {
  it('should append the history entry with the actor and a guard', async () => {
    const order = anOrderFixture({ status: EOrderStatus.PLACED });
    const estimatedReadyAt = new Date('2026-10-01T12:30:00Z');

    const updated = await transitionService.transitionOrder({
      order,
      to: EOrderStatus.PREPARING,
      actor: STAFF,
      set: { estimatedReadyAt },
    });

    expect(updated.status).toBe(EOrderStatus.PREPARING);
    expect(orderRepositoryWrite.updateOrderStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: order.id,
        from: EOrderStatus.PLACED,
        entry: expect.objectContaining({ status: EOrderStatus.PREPARING, by: STAFF }),
        set: expect.objectContaining({ estimatedReadyAt }),
      }),
      'tx',
    );
  });

  it('should throw a ConflictError when the status changed meanwhile', async () => {
    orderRepositoryWrite.updateOrderStatus.mockResolvedValue(null);

    await expect(
      transitionService.transitionOrder({
        order: anOrderFixture({ status: EOrderStatus.PLACED }),
        to: EOrderStatus.PREPARING,
        actor: STAFF,
      }),
    ).rejects.toThrow(ConflictError);
  });

  it('should reject an invalid transition before touching the database', async () => {
    await expect(
      transitionService.transitionOrder({
        order: anOrderFixture({ status: EOrderStatus.PLACED }),
        to: EOrderStatus.READY,
        actor: STAFF,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_STATUS_TRANSITION' });
    expect(orderRepositoryWrite.updateOrderStatus).not.toHaveBeenCalled();
  });
});

describe('When an order is paid (CPN-R09)', () => {
  it('should reserve the coupon use when the order becomes PLACED', async () => {
    await transitionService.transitionOrder({
      order: anOrderFixture({
        status: EOrderStatus.AWAITING_PAYMENT,
        coupon: COUPON,
      }),
      to: EOrderStatus.PLACED,
      actor: { type: EOrderActorType.SYSTEM },
    });

    expect(couponService.reserveCouponUse).toHaveBeenCalledWith(
      'coupon-1',
      'tx',
    );
  });
});

describe('When an order is rejected or canceled', () => {
  it('should refund an approved payment and keep the reason (ORD-R16)', async () => {
    await transitionService.transitionOrder({
      order: anOrderFixture({
        status: EOrderStatus.PLACED,
        payment: APPROVED_PIX,
      }),
      to: EOrderStatus.REJECTED,
      actor: STAFF,
      reason: ' Sem gás ',
    });

    expect(orderRepositoryWrite.updateOrderStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        set: expect.objectContaining({
          cancelReason: 'Sem gás',
          payment: expect.objectContaining({
            status: EPaymentStatus.REFUNDED,
          }),
        }),
      }),
      'tx',
    );
    expect(paymentGateway.refund).toHaveBeenCalledWith('pix_1');
  });

  it('should release the coupon use of a placed order (CPN-R09)', async () => {
    await transitionService.transitionOrder({
      order: anOrderFixture({ status: EOrderStatus.PLACED, coupon: COUPON }),
      to: EOrderStatus.CANCELED,
      actor: { type: EOrderActorType.CUSTOMER, id: 'customer-1' },
    });

    expect(couponService.releaseCouponUse).toHaveBeenCalledWith(
      'coupon-1',
      'tx',
    );
    expect(paymentGateway.refund).not.toHaveBeenCalled();
  });

  it('should not release a coupon of an unpaid order', async () => {
    await transitionService.transitionOrder({
      order: anOrderFixture({
        status: EOrderStatus.AWAITING_PAYMENT,
        coupon: COUPON,
      }),
      to: EOrderStatus.CANCELED,
      actor: { type: EOrderActorType.SYSTEM },
    });

    expect(couponService.releaseCouponUse).not.toHaveBeenCalled();
  });
});
