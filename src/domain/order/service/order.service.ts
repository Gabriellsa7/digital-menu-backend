import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { Logger } from 'traceability';
import { IClock } from '../../common/clock.interface';
import { ICounterRepository } from '../../common/counter.repository';
import {
  IPaginatedResult,
  IPagination,
} from '../../common/pagination.interface';
import { ITransactionRunner } from '../../common/transaction.interface';
import { ICouponService } from '../../coupon/interfaces/coupon.service.interface';
import { ICustomerService } from '../../customer/interfaces/customer.service.interface';
import { NotFoundError } from '../../errors/not-found.error';
import { isPaidOnDelivery } from '../../payment/initial-payment';
import { IPaymentService } from '../../payment/interfaces/payment.service.interface';
import {
  IOrderPricingService,
  IOrderQuote,
  IParamsQuoteOrder,
} from '../interfaces/order-pricing.service.interface';
import { IOrderTransitionService } from '../interfaces/order-transition.service.interface';
import {
  EOrderActorType,
  EOrderStatus,
  IOrder,
} from '../interfaces/order.interface';
import {
  IOrderService,
  IParamsCreateOrder,
  IParamsOrderService,
} from '../interfaces/order.service.interface';
import { Order } from '../order.entity';
import { IOrderRepositoryRead } from '../repository/order.repository.read';
import { IOrderRepositoryWrite } from '../repository/order.repository.write';

export const ORDER_NUMBER_COUNTER = 'order_number';

export class OrderService implements IOrderService {
  private orderRepositoryRead: IOrderRepositoryRead;
  private orderRepositoryWrite: IOrderRepositoryWrite;
  private counterRepository: ICounterRepository;
  private transactionRunner: ITransactionRunner;
  private orderPricingService: IOrderPricingService;
  private customerService: ICustomerService;
  private couponService: ICouponService;
  private paymentService: IPaymentService;
  private orderTransitionService: IOrderTransitionService;
  private clock: IClock;

  constructor({
    orderRepositoryRead,
    orderRepositoryWrite,
    counterRepository,
    transactionRunner,
    orderPricingService,
    customerService,
    couponService,
    paymentService,
    orderTransitionService,
    clock,
  }: IParamsOrderService) {
    this.orderRepositoryRead = orderRepositoryRead;
    this.orderRepositoryWrite = orderRepositoryWrite;
    this.counterRepository = counterRepository;
    this.transactionRunner = transactionRunner;
    this.orderPricingService = orderPricingService;
    this.customerService = customerService;
    this.couponService = couponService;
    this.paymentService = paymentService;
    this.orderTransitionService = orderTransitionService;
    this.clock = clock;
  }

  @ErrorHandler()
  async quoteOrder(params: IParamsQuoteOrder): Promise<IOrderQuote> {
    return this.orderPricingService.quoteOrder(params);
  }

  @ErrorHandler()
  async createOrder(params: IParamsCreateOrder): Promise<IOrder> {
    if (params.idempotencyKey) {
      const existing = await this.orderRepositoryRead.findOrderByIdempotencyKey(
        params.customerId,
        params.idempotencyKey,
      );
      if (existing) {
        return existing;
      }
    }
    const customer = await this.customerService.assertCustomerCanOrder(
      params.customerId,
    );
    const quote = await this.orderPricingService.quoteOrder(params);
    const now = this.clock.now();
    const status = isPaidOnDelivery(params.paymentMethod)
      ? EOrderStatus.PLACED
      : EOrderStatus.AWAITING_PAYMENT;
    const { etaMinMinutes, etaMaxMinutes, ...pricing } = quote;

    const order = await this.transactionRunner.runInTransaction(
      async (context) => {
        const number = await this.counterRepository.nextValue(
          ORDER_NUMBER_COUNTER,
          context,
        );
        const id = randomUUID();
        const payment = await this.paymentService.startPayment({
          orderId: id,
          orderNumber: number,
          method: params.paymentMethod,
          amountInCents: pricing.totalInCents,
          changeForInCents: params.changeForInCents,
        });
        const newOrder = new Order({
          ...pricing,
          id,
          number,
          customerId: customer.id,
          customerSnapshot: { name: customer.name!, phone: customer.phone! },
          payment,
          status,
          statusHistory: [
            {
              status,
              at: now,
              by: { type: EOrderActorType.CUSTOMER, id: customer.id },
            },
          ],
          ...(params.notes?.trim() && { notes: params.notes.trim() }),
          ...(params.idempotencyKey && {
            idempotencyKey: params.idempotencyKey,
          }),
          createdAt: now,
          updatedAt: now,
        });
        if (newOrder.holdsCouponUse()) {
          await this.couponService.reserveCouponUse(newOrder.coupon!.id, context);
        }
        return this.orderRepositoryWrite.createOrder(newOrder, context);
      },
    );
    Logger.info('Order created', {
      eventName: 'order.created',
      orderId: order.id,
      number: order.number,
      status: order.status,
      totalInCents: order.totalInCents,
    });
    return order;
  }

  @ErrorHandler()
  async listOrdersForCustomer(
    customerId: string,
    pagination: IPagination,
  ): Promise<IPaginatedResult<IOrder>> {
    return this.orderRepositoryRead.listOrdersByCustomer(customerId, pagination);
  }

  @ErrorHandler()
  async getOrderForCustomer(
    orderId: string,
    customerId: string,
  ): Promise<IOrder> {
    const order = await this.orderRepositoryRead.findOrderById(orderId);

    return order && order.customerId === customerId
      ? order
      : this.throwOrderNotFound();
  }

  @ErrorHandler()
  async cancelOrderByCustomer(
    orderId: string,
    customerId: string,
    reason?: string,
  ): Promise<IOrder> {
    const order = await this.getOrderForCustomer(orderId, customerId);
    return this.orderTransitionService.transitionOrder({
      order,
      to: EOrderStatus.CANCELED,
      actor: { type: EOrderActorType.CUSTOMER, id: customerId },
      reason: reason ?? 'Canceled by the customer',
    });
  }

  private throwOrderNotFound(): never {
    throw new NotFoundError('Order not found');
  }
}
