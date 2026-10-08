import { IClock } from '../../common/clock.interface';
import { ICounterRepository } from '../../common/counter.repository';
import {
  IPaginatedResult,
  IPagination,
} from '../../common/pagination.interface';
import { ITransactionRunner } from '../../common/transaction.interface';
import { ICouponService } from '../../coupon/interfaces/coupon.service.interface';
import { ICustomerService } from '../../customer/interfaces/customer.service.interface';
import { IPaymentService } from '../../payment/interfaces/payment.service.interface';
import {
  IOrderRepositoryRead,
  IParamsSearchOrders,
} from '../repository/order.repository.read';
import { IOrderTransitionService } from './order-transition.service.interface';
import { IOrderEventPublisher } from '../events/order.event.publisher';
import { IOrderRepositoryWrite } from '../repository/order.repository.write';
import {
  IOrderPricingService,
  IOrderQuote,
  IParamsQuoteOrder,
} from './order-pricing.service.interface';
import { EOrderStatus, IOrder } from './order.interface';

export interface IParamsCreateOrder extends IParamsQuoteOrder {
  notes?: string;
  idempotencyKey?: string;
}

export interface IParamsChangeOrderStatus {
  orderId: string;
  staffId: string;
  status: EOrderStatus;
  estimatedMinutes?: number;
}

export interface IParamsEndOrderByStaff {
  orderId: string;
  staffId: string;
  reason: string;
}

export interface IParamsOrderService {
  orderRepositoryRead: IOrderRepositoryRead;
  orderRepositoryWrite: IOrderRepositoryWrite;
  counterRepository: ICounterRepository;
  transactionRunner: ITransactionRunner;
  orderPricingService: IOrderPricingService;
  customerService: ICustomerService;
  couponService: ICouponService;
  paymentService: IPaymentService;
  orderTransitionService: IOrderTransitionService;
  orderEventPublisher: IOrderEventPublisher;
  clock: IClock;
}

export interface IOrderService {
  quoteOrder(params: IParamsQuoteOrder): Promise<IOrderQuote>;
  createOrder(params: IParamsCreateOrder): Promise<IOrder>;
  listOrdersForCustomer(
    customerId: string,
    pagination: IPagination,
  ): Promise<IPaginatedResult<IOrder>>;
  getOrderForCustomer(orderId: string, customerId: string): Promise<IOrder>;
  cancelOrderByCustomer(
    orderId: string,
    customerId: string,
    reason?: string,
  ): Promise<IOrder>;
  searchOrders(params: IParamsSearchOrders): Promise<IPaginatedResult<IOrder>>;
  listActiveOrders(): Promise<IOrder[]>;
  getOrderById(orderId: string): Promise<IOrder>;
  changeOrderStatus(params: IParamsChangeOrderStatus): Promise<IOrder>;
  rejectOrder(params: IParamsEndOrderByStaff): Promise<IOrder>;
  cancelOrderByStaff(params: IParamsEndOrderByStaff): Promise<IOrder>;
}
