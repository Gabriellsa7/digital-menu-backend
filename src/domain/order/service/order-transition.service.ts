import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { Logger } from 'traceability';
import { IClock } from '../../common/clock.interface';
import { ITransactionRunner } from '../../common/transaction.interface';
import { ICouponService } from '../../coupon/interfaces/coupon.service.interface';
import { ConflictError } from '../../errors/conflict.error';
import { IPaymentGateway } from '../../payment/interfaces/payment.gateway.interface';
import {
  EPaymentStatus,
  IPayment,
} from '../../payment/interfaces/payment.interface';
import {
  IOrderTransitionService,
  IParamsOrderTransitionService,
  IParamsTransitionOrder,
} from '../interfaces/order-transition.service.interface';
import { EOrderStatus, IOrder } from '../interfaces/order.interface';
import { Order } from '../order.entity';
import { assertOrderTransition } from '../policies/order-status.policy';
import { IOrderRepositoryWrite } from '../repository/order.repository.write';

const ENDING_STATUSES = [EOrderStatus.CANCELED, EOrderStatus.REJECTED];

export class OrderTransitionService implements IOrderTransitionService {
  private orderRepositoryWrite: IOrderRepositoryWrite;
  private couponService: ICouponService;
  private paymentGateway: IPaymentGateway;
  private transactionRunner: ITransactionRunner;
  private clock: IClock;

  constructor({
    orderRepositoryWrite,
    couponService,
    paymentGateway,
    transactionRunner,
    clock,
  }: IParamsOrderTransitionService) {
    this.orderRepositoryWrite = orderRepositoryWrite;
    this.couponService = couponService;
    this.paymentGateway = paymentGateway;
    this.transactionRunner = transactionRunner;
    this.clock = clock;
  }

  @ErrorHandler()
  async transitionOrder({
    order,
    to,
    actor,
    reason,
    set = {},
  }: IParamsTransitionOrder): Promise<IOrder> {
    assertOrderTransition({ order, to, actor, reason });
    const current = new Order(order);
    const isEnding = ENDING_STATUSES.includes(to);
    const payment = set.payment ?? order.payment;
    const shouldRefund = isEnding && payment.status === EPaymentStatus.APPROVED;
    const nextPayment: IPayment = shouldRefund
      ? { ...payment, status: EPaymentStatus.REFUNDED }
      : payment;
    const trimmedReason = reason?.trim();

    const updated = await this.transactionRunner.runInTransaction(
      async (context) => {
        const saved = await this.orderRepositoryWrite.updateOrderStatus(
          {
            id: order.id,
            from: order.status,
            entry: {
              status: to,
              at: this.clock.now(),
              by: actor,
              ...(trimmedReason && { reason: trimmedReason }),
            },
            set: {
              ...set,
              payment: nextPayment,
              ...(isEnding && trimmedReason && { cancelReason: trimmedReason }),
            },
          },
          context,
        );
        if (!saved) {
          throw new ConflictError(
            'The order status changed in the meantime',
            'ORDER_STATUS_CHANGED',
          );
        }
        if (to === EOrderStatus.PLACED && order.coupon) {
          await this.couponService.reserveCouponUse(order.coupon.id, context);
        }
        if (isEnding && current.holdsCouponUse()) {
          await this.couponService.releaseCouponUse(order.coupon!.id, context);
        }
        return saved;
      },
    );

    if (shouldRefund && payment.transactionId) {
      await this.paymentGateway.refund(payment.transactionId);
    }
    Logger.info('Order status changed', {
      eventName: 'order.status_changed',
      orderId: order.id,
      from: order.status,
      to,
      actor: actor.type,
    });
    return updated;
  }
}
