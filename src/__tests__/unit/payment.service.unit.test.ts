import {
  MAX_CARD_ATTEMPTS,
  PaymentService,
} from '../../domain/payment/service/payment.service';
import { IOrderRepositoryRead } from '../../domain/order/repository/order.repository.read';
import { IOrderRepositoryWrite } from '../../domain/order/repository/order.repository.write';
import { IOrderTransitionService } from '../../domain/order/interfaces/order-transition.service.interface';
import {
  EOrderActorType,
  EOrderStatus,
  IOrder,
} from '../../domain/order/interfaces/order.interface';
import {
  EPaymentMethod,
  EPaymentStatus,
} from '../../domain/payment/interfaces/payment.interface';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { MockPaymentGateway } from '../../infrastructure/payment/mock.payment.gateway';
import { anOrderFixture } from '../helpers/order.fixtures';
import { FixedClock } from '../helpers/fixed.clock';

const CARD = { holder: 'NAMI', expiry: '12/30', cvv: '123' };

function anUnpaidOrder(
  method: EPaymentMethod,
  overrides: Partial<IOrder> = {},
): IOrder {
  return anOrderFixture({
    id: 'order-1',
    status: EOrderStatus.AWAITING_PAYMENT,
    payment: { method, status: EPaymentStatus.PENDING, failedAttempts: 0 },
    ...overrides,
  });
}

let clock: FixedClock;
let orderRepositoryRead: jest.Mocked<
  Pick<IOrderRepositoryRead, 'findOrderById' | 'listOrdersAwaitingPaymentSince'>
>;
let orderRepositoryWrite: jest.Mocked<
  Pick<IOrderRepositoryWrite, 'updateOrderPayment'>
>;
let orderTransitionService: jest.Mocked<IOrderTransitionService>;
let paymentService: PaymentService;

beforeEach(() => {
  clock = new FixedClock();
  orderRepositoryRead = {
    findOrderById: jest.fn(),
    listOrdersAwaitingPaymentSince: jest.fn().mockResolvedValue([]),
  };
  orderRepositoryWrite = { updateOrderPayment: jest.fn() };
  orderTransitionService = {
    transitionOrder: jest.fn(async ({ order, to, set }) => ({
      ...order,
      ...set,
      status: to,
    })),
  };
  paymentService = new PaymentService({
    orderRepositoryRead: orderRepositoryRead as unknown as IOrderRepositoryRead,
    orderRepositoryWrite:
      orderRepositoryWrite as unknown as IOrderRepositoryWrite,
    orderTransitionService,
    paymentGateway: new MockPaymentGateway(),
    clock,
  });
});

describe('When a payment starts', () => {
  it('should create a Pix charge that expires in 10 minutes (PAY-R01)', async () => {
    const payment = await paymentService.startPayment({
      orderId: 'order-1',
      orderNumber: 7,
      method: EPaymentMethod.PIX,
      amountInCents: 3000,
    });

    expect(payment).toMatchObject({
      status: EPaymentStatus.PENDING,
      pix: { expiresAt: new Date('2026-10-01T12:10:00.000Z') },
    });
    expect(payment.pix?.qrCodeBase64).toEqual(expect.any(String));
  });

});

describe('When a customer pays with a card (PAY-R03, R05)', () => {
  beforeEach(() => {
    orderRepositoryRead.findOrderById.mockResolvedValue(
      anUnpaidOrder(EPaymentMethod.CARD_ONLINE),
    );
  });

  it('should approve the test card and place the order (PAY-R04)', async () => {
    const order = await paymentService.chargeCard({
      orderId: 'order-1',
      customerId: 'customer-1',
      card: { ...CARD, number: '4242 4242 4242 4242' },
    });

    expect(order.status).toBe(EOrderStatus.PLACED);
    expect(order.payment).toMatchObject({
      status: EPaymentStatus.APPROVED,
      card: { brand: 'VISA', last4: '4242' },
      paidAt: clock.now(),
    });
    expect(JSON.stringify(order)).not.toContain('4242424242424242');
  });

  it('should keep the order waiting after a decline', async () => {
    await expect(
      paymentService.chargeCard({
        orderId: 'order-1',
        customerId: 'customer-1',
        card: { ...CARD, number: '4000000000000002' },
      }),
    ).rejects.toMatchObject({
      code: 'CARD_DECLINED',
      details: { attemptsLeft: 2 },
    });
    expect(orderRepositoryWrite.updateOrderPayment).toHaveBeenCalledWith(
      'order-1',
      EOrderStatus.AWAITING_PAYMENT,
      expect.objectContaining({
        status: EPaymentStatus.DECLINED,
        failedAttempts: 1,
      }),
    );
  });

  it('should cancel the order after the last declined attempt', async () => {
    orderRepositoryRead.findOrderById.mockResolvedValue(
      anUnpaidOrder(EPaymentMethod.CARD_ONLINE, {
        payment: {
          method: EPaymentMethod.CARD_ONLINE,
          status: EPaymentStatus.DECLINED,
          failedAttempts: MAX_CARD_ATTEMPTS - 1,
        },
      }),
    );

    await expect(
      paymentService.chargeCard({
        orderId: 'order-1',
        customerId: 'customer-1',
        card: { ...CARD, number: '1111222233334444' },
      }),
    ).rejects.toMatchObject({ code: 'CARD_INVALID' });
    expect(orderTransitionService.transitionOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        to: EOrderStatus.CANCELED,
        actor: { type: EOrderActorType.SYSTEM },
      }),
    );
  });

  it("should hide another customer's order (ORD-R18)", async () => {
    await expect(
      paymentService.chargeCard({
        orderId: 'order-1',
        customerId: 'intruder',
        card: { ...CARD, number: '4242424242424242' },
      }),
    ).rejects.toThrow(NotFoundError);
  });

});

describe('When a Pix payment is confirmed (PAY-R02)', () => {
  it('should place the order', async () => {
    orderRepositoryRead.findOrderById.mockResolvedValue(
      anUnpaidOrder(EPaymentMethod.PIX),
    );

    const order = await paymentService.approvePix({
      orderId: 'order-1',
      customerId: 'customer-1',
    });

    expect(order).toMatchObject({
      status: EOrderStatus.PLACED,
      payment: { status: EPaymentStatus.APPROVED },
    });
  });

  it('should refuse an expired Pix charge', async () => {
    orderRepositoryRead.findOrderById.mockResolvedValue(
      anUnpaidOrder(EPaymentMethod.PIX, {
        payment: {
          method: EPaymentMethod.PIX,
          status: EPaymentStatus.PENDING,
          failedAttempts: 0,
          pix: { copyPaste: 'x', qrCodeBase64: 'x', expiresAt: clock.now() },
        },
      }),
    );

    await expect(
      paymentService.approvePix({ orderId: 'order-1' }),
    ).rejects.toMatchObject({ code: 'PIX_EXPIRED' });
  });
});

describe('When the jobs run', () => {
  it('should cancel orders unpaid for 15 minutes as EXPIRED (PAY-R06)', async () => {
    orderRepositoryRead.listOrdersAwaitingPaymentSince.mockResolvedValue([
      anUnpaidOrder(EPaymentMethod.PIX),
    ]);

    await expect(paymentService.expireUnpaidOrders()).resolves.toBe(1);
    expect(
      orderRepositoryRead.listOrdersAwaitingPaymentSince,
    ).toHaveBeenCalledWith(new Date('2026-10-01T11:45:00.000Z'));
    expect(orderTransitionService.transitionOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        to: EOrderStatus.CANCELED,
        set: {
          payment: expect.objectContaining({ status: EPaymentStatus.EXPIRED }),
        },
      }),
    );
  });

  it('should auto-approve pending Pix orders (PAY-R02)', async () => {
    const order = anUnpaidOrder(EPaymentMethod.PIX);
    orderRepositoryRead.listOrdersAwaitingPaymentSince.mockResolvedValue([
      order,
    ]);
    orderRepositoryRead.findOrderById.mockResolvedValue(order);

    await expect(paymentService.approvePendingPix(30)).resolves.toBe(1);
    expect(
      orderRepositoryRead.listOrdersAwaitingPaymentSince,
    ).toHaveBeenCalledWith(new Date('2026-10-01T11:59:30.000Z'), [
      EPaymentMethod.PIX,
    ]);
  });
});
