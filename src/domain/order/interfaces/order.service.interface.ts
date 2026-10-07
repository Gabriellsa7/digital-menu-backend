import { IClock } from '../../common/clock.interface';
import { ICounterRepository } from '../../common/counter.repository';
import { ITransactionRunner } from '../../common/transaction.interface';
import { ICouponService } from '../../coupon/interfaces/coupon.service.interface';
import { ICustomerService } from '../../customer/interfaces/customer.service.interface';
import { IOrderRepositoryRead } from '../repository/order.repository.read';
import { IOrderRepositoryWrite } from '../repository/order.repository.write';
import {
  IOrderPricingService,
  IOrderQuote,
  IParamsQuoteOrder,
} from './order-pricing.service.interface';
import { IOrder } from './order.interface';

export interface IParamsCreateOrder extends IParamsQuoteOrder {
  notes?: string;
  idempotencyKey?: string;
}

export interface IParamsOrderService {
  orderRepositoryRead: IOrderRepositoryRead;
  orderRepositoryWrite: IOrderRepositoryWrite;
  counterRepository: ICounterRepository;
  transactionRunner: ITransactionRunner;
  orderPricingService: IOrderPricingService;
  customerService: ICustomerService;
  couponService: ICouponService;
  clock: IClock;
}

export interface IOrderService {
  quoteOrder(params: IParamsQuoteOrder): Promise<IOrderQuote>;
  createOrder(params: IParamsCreateOrder): Promise<IOrder>;
}
