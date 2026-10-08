import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { Logger } from 'traceability';
import { IClock } from '../../common/clock.interface';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { NotFoundError } from '../../errors/not-found.error';
import { IOrderEventPublisher } from '../../order/events/order.event.publisher';
import { IOrderTransitionService } from '../../order/interfaces/order-transition.service.interface';
import {
  EOrderActorType,
  EOrderStatus,
  IOrder,
  IOrderActor,
} from '../../order/interfaces/order.interface';
import { IOrderRepositoryRead } from '../../order/repository/order.repository.read';
import { IOrderRepositoryWrite } from '../../order/repository/order.repository.write';
import { buildInitialPayment } from '../initial-payment';
import {
  ECardChargeOutcome,
  IPaymentGateway,
} from '../interfaces/payment.gateway.interface';
import {
  EPaymentMethod,
  EPaymentStatus,
  IPayment,
} from '../interfaces/payment.interface';
import {
  IParamsApprovePix,
  IParamsChargeOrderCard,
  IParamsPaymentService,
  IParamsStartPayment,
  IPaymentService,
} from '../interfaces/payment.service.interface';

export const PIX_TTL_SECONDS = 10 * 60;
export const UNPAID_ORDER_TTL_SECONDS = 15 * 60;
export const MAX_CARD_ATTEMPTS = 3;

const SYSTEM_ACTOR: IOrderActor = { type: EOrderActorType.SYSTEM };

export class PaymentService implements IPaymentService {
  private orderRepositoryRead: IOrderRepositoryRead;
  private orderRepositoryWrite: IOrderRepositoryWrite;
  private orderTransitionService: IOrderTransitionService;
  private paymentGateway: IPaymentGateway;
  private orderEventPublisher: IOrderEventPublisher;
  private clock: IClock;

  constructor({
    orderRepositoryRead,
    orderRepositoryWrite,
    orderTransitionService,
    paymentGateway,
    orderEventPublisher,
    clock,
  }: IParamsPaymentService) {
    this.orderRepositoryRead = orderRepositoryRead;
    this.orderRepositoryWrite = orderRepositoryWrite;
    this.orderTransitionService = orderTransitionService;
    this.paymentGateway = paymentGateway;
    this.orderEventPublisher = orderEventPublisher;
    this.clock = clock;
  }

  @ErrorHandler()
  async startPayment({
    orderId,
    orderNumber,
    method,
    amountInCents,
    changeForInCents,
  }: IParamsStartPayment): Promise<IPayment> {
    const payment = buildInitialPayment(method, changeForInCents);
    if (method !== EPaymentMethod.PIX) {
      return payment;
    }
    const charge = await this.paymentGateway.createPixCharge({
      orderId,
      orderNumber,
      amountInCents,
    });
    return {
      ...payment,
      pix: {
        copyPaste: charge.copyPaste,
        qrCodeBase64: charge.qrCodeBase64,
        expiresAt: new Date(this.clock.now().getTime() + PIX_TTL_SECONDS * 1000),
      },
      transactionId: charge.transactionId,
    };
  }

  @ErrorHandler()
  async chargeCard({
    orderId,
    customerId,
    card,
  }: IParamsChargeOrderCard): Promise<IOrder> {
    const order = await this.getPayableOrder(
      orderId,
      EPaymentMethod.CARD_ONLINE,
      customerId,
    );
    const result = await this.paymentGateway.chargeCard({
      orderId,
      amountInCents: order.totalInCents,
      card,
    });
    const cardInfo = { brand: result.brand, last4: result.last4 };

    if (result.outcome === ECardChargeOutcome.APPROVED) {
      return this.placePaidOrder(
        order,
        { ...order.payment, card: cardInfo, transactionId: result.transactionId },
        { type: EOrderActorType.CUSTOMER, id: customerId },
      );
    }

    const failedAttempts = order.payment.failedAttempts + 1;
    const payment: IPayment = {
      ...order.payment,
      status: EPaymentStatus.DECLINED,
      card: cardInfo,
      failedAttempts,
    };
    if (failedAttempts >= MAX_CARD_ATTEMPTS) {
      await this.orderTransitionService.transitionOrder({
        order,
        to: EOrderStatus.CANCELED,
        actor: SYSTEM_ACTOR,
        reason: 'Card declined too many times',
        set: { payment },
      });
    } else {
      const updated = await this.orderRepositoryWrite.updateOrderPayment(
        order.id,
        EOrderStatus.AWAITING_PAYMENT,
        payment,
      );
      if (updated) {
        this.orderEventPublisher.publishOrderPaymentUpdated(updated);
      }
    }
    throw new BusinessRuleError(
      result.outcome === ECardChargeOutcome.DECLINED
        ? 'Card declined'
        : 'Card is invalid',
      result.outcome === ECardChargeOutcome.DECLINED
        ? 'CARD_DECLINED'
        : 'CARD_INVALID',
      { attemptsLeft: Math.max(0, MAX_CARD_ATTEMPTS - failedAttempts) },
    );
  }

  @ErrorHandler()
  async approvePix({
    orderId,
    customerId,
  }: IParamsApprovePix): Promise<IOrder> {
    const order = await this.getPayableOrder(
      orderId,
      EPaymentMethod.PIX,
      customerId,
    );
    const expiresAt = order.payment.pix?.expiresAt;
    if (expiresAt && expiresAt.getTime() <= this.clock.now().getTime()) {
      throw new BusinessRuleError('Pix charge expired', 'PIX_EXPIRED');
    }
    return this.placePaidOrder(
      order,
      order.payment,
      customerId
        ? { type: EOrderActorType.CUSTOMER, id: customerId }
        : SYSTEM_ACTOR,
    );
  }

  @ErrorHandler()
  async expireUnpaidOrders(): Promise<number> {
    const orders = await this.orderRepositoryRead.listOrdersAwaitingPaymentSince(
      this.secondsAgo(UNPAID_ORDER_TTL_SECONDS),
    );
    const results = await Promise.allSettled(
      orders.map((order) =>
        this.orderTransitionService.transitionOrder({
          order,
          to: EOrderStatus.CANCELED,
          actor: SYSTEM_ACTOR,
          reason: 'Payment not received in time',
          set: {
            payment: { ...order.payment, status: EPaymentStatus.EXPIRED },
          },
        }),
      ),
    );
    return this.countFulfilled(results, 'payment.orders_expired');
  }

  @ErrorHandler()
  async approvePendingPix(olderThanSeconds: number): Promise<number> {
    const orders = await this.orderRepositoryRead.listOrdersAwaitingPaymentSince(
      this.secondsAgo(olderThanSeconds),
      [EPaymentMethod.PIX],
    );
    const results = await Promise.allSettled(
      orders.map((order) => this.approvePix({ orderId: order.id })),
    );
    return this.countFulfilled(results, 'payment.pix_auto_approved');
  }

  private async getPayableOrder(
    orderId: string,
    method: EPaymentMethod,
    customerId?: string,
  ): Promise<IOrder> {
    const order = await this.orderRepositoryRead.findOrderById(orderId);
    if (!order || (customerId && order.customerId !== customerId)) {
      throw new NotFoundError('Order not found');
    }
    if (
      order.status !== EOrderStatus.AWAITING_PAYMENT ||
      order.payment.method !== method
    ) {
      throw new BusinessRuleError(
        'This order does not accept this payment',
        'PAYMENT_NOT_ALLOWED',
        { status: order.status, method: order.payment.method },
      );
    }
    return order;
  }

  private placePaidOrder(
    order: IOrder,
    payment: IPayment,
    actor: IOrderActor,
  ): Promise<IOrder> {
    const now = this.clock.now();
    return this.orderTransitionService.transitionOrder({
      order,
      to: EOrderStatus.PLACED,
      actor,
      set: {
        payment: { ...payment, status: EPaymentStatus.APPROVED, paidAt: now },
      },
    });
  }

  private secondsAgo(seconds: number): Date {
    return new Date(this.clock.now().getTime() - seconds * 1000);
  }

  private countFulfilled(
    results: PromiseSettledResult<unknown>[],
    eventName: string,
  ): number {
    const fulfilled = results.filter(({ status }) => status === 'fulfilled');
    if (results.length > 0) {
      Logger.info('Payment job processed orders', {
        eventName,
        processed: fulfilled.length,
        failed: results.length - fulfilled.length,
      });
    }
    return fulfilled.length;
  }
}
