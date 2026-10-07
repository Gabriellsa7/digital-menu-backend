import { IClock } from '../../common/clock.interface';
import { ITransactionRunner } from '../../common/transaction.interface';
import { ICouponService } from '../../coupon/interfaces/coupon.service.interface';
import { IPaymentGateway } from '../../payment/interfaces/payment.gateway.interface';
import { IOrderRepositoryWrite } from '../repository/order.repository.write';
import {
  EOrderStatus,
  IOrder,
  IOrderActor,
} from './order.interface';

export interface IParamsTransitionOrder {
  order: IOrder;
  to: EOrderStatus;
  actor: IOrderActor;
  reason?: string;
  set?: Partial<Pick<IOrder, 'estimatedReadyAt' | 'payment'>>;
}

export interface IParamsOrderTransitionService {
  orderRepositoryWrite: IOrderRepositoryWrite;
  couponService: ICouponService;
  paymentGateway: IPaymentGateway;
  transactionRunner: ITransactionRunner;
  clock: IClock;
}

export interface IOrderTransitionService {
  transitionOrder(params: IParamsTransitionOrder): Promise<IOrder>;
}
