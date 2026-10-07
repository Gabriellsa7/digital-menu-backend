import { OrderService } from '../../domain/order/service/order.service';
import { IOrderRepositoryRead } from '../../domain/order/repository/order.repository.read';
import { IOrderRepositoryWrite } from '../../domain/order/repository/order.repository.write';
import { IOrderPricingService } from '../../domain/order/interfaces/order-pricing.service.interface';
import { IParamsCreateOrder } from '../../domain/order/interfaces/order.service.interface';
import {
  EFulfillmentType,
  EOrderStatus,
} from '../../domain/order/interfaces/order.interface';
import { ICustomerService } from '../../domain/customer/interfaces/customer.service.interface';
import { ICouponService } from '../../domain/coupon/interfaces/coupon.service.interface';
import { ECouponType } from '../../domain/coupon/interfaces/coupon.interface';
import { ITransactionRunner } from '../../domain/common/transaction.interface';
import {
  EPaymentMethod,
  EPaymentStatus,
} from '../../domain/payment/interfaces/payment.interface';
import { BusinessRuleError } from '../../domain/errors/business-rule.error';
import { IOrderTransitionService } from '../../domain/order/interfaces/order-transition.service.interface';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { IPaymentService } from '../../domain/payment/interfaces/payment.service.interface';
import { buildInitialPayment } from '../../domain/payment/initial-payment';
import { aCustomerFixture } from '../helpers/catalog.fixtures';
import { anOrderFixture } from '../helpers/order.fixtures';
import { FixedClock } from '../helpers/fixed.clock';

const QUOTE = {
  items: anOrderFixture().items,
  fulfillmentType: EFulfillmentType.PICKUP,
  subtotalInCents: 3000,
  deliveryFeeInCents: 0,
  discountInCents: 500,
  totalInCents: 2500,
  coupon: { id: 'coupon-1', code: 'OFF5', type: ECouponType.FIXED, value: 500 },
  etaMinMinutes: 20,
  etaMaxMinutes: 20,
};

function aCreateParams(
  overrides: Partial<IParamsCreateOrder> = {},
): IParamsCreateOrder {
  return {
    customerId: 'customer-1',
    items: [{ productId: 'smash', quantity: 1, options: [] }],
    fulfillmentType: EFulfillmentType.PICKUP,
    paymentMethod: EPaymentMethod.CASH_ON_DELIVERY,
    ...overrides,
  };
}

let orderRepositoryRead: jest.Mocked<
  Pick<IOrderRepositoryRead, 'findOrderByIdempotencyKey' | 'findOrderById'>
>;
let orderTransitionService: jest.Mocked<IOrderTransitionService>;
let orderRepositoryWrite: jest.Mocked<Pick<IOrderRepositoryWrite, 'createOrder'>>;
let orderPricingService: jest.Mocked<IOrderPricingService>;
let customerService: jest.Mocked<
  Pick<ICustomerService, 'assertCustomerCanOrder'>
>;
let couponService: jest.Mocked<Pick<ICouponService, 'reserveCouponUse'>>;
let orderService: OrderService;

beforeEach(() => {
  orderRepositoryRead = {
    findOrderByIdempotencyKey: jest.fn().mockResolvedValue(null),
    findOrderById: jest.fn(),
  };
  orderTransitionService = {
    transitionOrder: jest.fn(async ({ order, to }) => ({
      ...order,
      status: to,
    })),
  };
  orderRepositoryWrite = {
    createOrder: jest.fn(async (order) => ({ ...order })),
  };
  orderPricingService = { quoteOrder: jest.fn().mockResolvedValue(QUOTE) };
  customerService = {
    assertCustomerCanOrder: jest.fn().mockResolvedValue(aCustomerFixture()),
  };
  couponService = { reserveCouponUse: jest.fn() };
  const transactionRunner: ITransactionRunner = {
    runInTransaction: (work) => work('tx'),
  };
  orderService = new OrderService({
    orderRepositoryRead: orderRepositoryRead as unknown as IOrderRepositoryRead,
    orderRepositoryWrite:
      orderRepositoryWrite as unknown as IOrderRepositoryWrite,
    counterRepository: { nextValue: jest.fn().mockResolvedValue(1042) },
    transactionRunner,
    orderPricingService,
    customerService: customerService as unknown as ICustomerService,
    couponService: couponService as unknown as ICouponService,
    paymentService: {
      startPayment: jest.fn(async ({ method, changeForInCents }) =>
        buildInitialPayment(method, changeForInCents),
      ),
    } as unknown as IPaymentService,
    orderTransitionService,
    clock: new FixedClock(),
  });
});

describe('When a customer places an order paid on delivery', () => {
  it('should create a PLACED order with the server quote (ORD-R12)', async () => {
    const order = await orderService.createOrder(
      aCreateParams({ notes: ' tocar a campainha ' }),
    );

    expect(order).toMatchObject({
      number: 1042,
      status: EOrderStatus.PLACED,
      totalInCents: 2500,
      customerSnapshot: { name: 'Nami', phone: '+5511999998888' },
      payment: { status: EPaymentStatus.ON_DELIVERY, failedAttempts: 0 },
      notes: 'tocar a campainha',
    });
    expect(order.statusHistory).toEqual([
      expect.objectContaining({ status: EOrderStatus.PLACED }),
    ]);
    expect(order).not.toHaveProperty('etaMinMinutes');
  });

  it('should reserve the coupon use inside the transaction (CPN-R09)', async () => {
    await orderService.createOrder(aCreateParams());

    expect(couponService.reserveCouponUse).toHaveBeenCalledWith(
      'coupon-1',
      'tx',
    );
    expect(orderRepositoryWrite.createOrder).toHaveBeenCalledWith(
      expect.any(Object),
      'tx',
    );
  });
});

describe('When a customer places an order paid online', () => {
  it('should wait for the payment and keep the coupon free (ORD-R12)', async () => {
    const order = await orderService.createOrder(
      aCreateParams({ paymentMethod: EPaymentMethod.PIX }),
    );

    expect(order.status).toBe(EOrderStatus.AWAITING_PAYMENT);
    expect(order.payment.status).toBe(EPaymentStatus.PENDING);
    expect(couponService.reserveCouponUse).not.toHaveBeenCalled();
  });
});

describe('When a checkout is retried', () => {
  it('should return the existing order for the same Idempotency-Key (ORD-R11)', async () => {
    const existing = anOrderFixture({ idempotencyKey: 'key-1' });
    orderRepositoryRead.findOrderByIdempotencyKey.mockResolvedValue(existing);

    const order = await orderService.createOrder(
      aCreateParams({ idempotencyKey: 'key-1' }),
    );

    expect(order).toBe(existing);
    expect(orderPricingService.quoteOrder).not.toHaveBeenCalled();
  });
});

describe('When the customer profile is incomplete (CUS-R04)', () => {
  it('should not quote nor create the order', async () => {
    customerService.assertCustomerCanOrder.mockRejectedValue(
      new BusinessRuleError('Incomplete', 'CUSTOMER_PROFILE_INCOMPLETE'),
    );

    await expect(
      orderService.createOrder(aCreateParams()),
    ).rejects.toMatchObject({ code: 'CUSTOMER_PROFILE_INCOMPLETE' });
    expect(orderRepositoryWrite.createOrder).not.toHaveBeenCalled();
  });
});

describe('When a customer reads or cancels an order', () => {
  it("should hide another customer's order as not found (ORD-R18)", async () => {
    orderRepositoryRead.findOrderById.mockResolvedValue(
      anOrderFixture({ customerId: 'someone-else' }),
    );

    await expect(
      orderService.getOrderForCustomer('order-1', 'customer-1'),
    ).rejects.toThrow(NotFoundError);
  });

  it('should cancel the own order as the customer (ORD-R15)', async () => {
    const order = anOrderFixture({ status: EOrderStatus.PLACED });
    orderRepositoryRead.findOrderById.mockResolvedValue(order);

    const canceled = await orderService.cancelOrderByCustomer(
      order.id,
      'customer-1',
    );

    expect(canceled.status).toBe(EOrderStatus.CANCELED);
    expect(orderTransitionService.transitionOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        to: EOrderStatus.CANCELED,
        actor: { type: 'CUSTOMER', id: 'customer-1' },
      }),
    );
  });
});

describe('When staff manages an order', () => {
  it('should set estimatedReadyAt when accepting (ORD-R13)', async () => {
    const order = anOrderFixture({ status: EOrderStatus.PLACED });
    orderRepositoryRead.findOrderById.mockResolvedValue(order);

    await orderService.changeOrderStatus({
      orderId: order.id,
      staffId: 'staff-1',
      status: EOrderStatus.PREPARING,
      estimatedMinutes: 25,
    });

    expect(orderTransitionService.transitionOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        to: EOrderStatus.PREPARING,
        actor: { type: 'STAFF', id: 'staff-1' },
        set: { estimatedReadyAt: new Date('2026-10-01T12:25:00.000Z') },
      }),
    );
  });

  it('should reject with the reason as the staff actor (ORD-R14)', async () => {
    const order = anOrderFixture({ status: EOrderStatus.PLACED });
    orderRepositoryRead.findOrderById.mockResolvedValue(order);

    await orderService.rejectOrder({
      orderId: order.id,
      staffId: 'staff-1',
      reason: 'Sem pão',
    });

    expect(orderTransitionService.transitionOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        to: EOrderStatus.REJECTED,
        reason: 'Sem pão',
      }),
    );
  });

  it('should throw NotFoundError for an unknown order', async () => {
    orderRepositoryRead.findOrderById.mockResolvedValue(null);

    await expect(
      orderService.cancelOrderByStaff({
        orderId: 'missing',
        staffId: 'staff-1',
        reason: 'x',
      }),
    ).rejects.toThrow(NotFoundError);
  });
});
