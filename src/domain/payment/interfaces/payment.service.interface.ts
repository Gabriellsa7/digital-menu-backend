import { IClock } from '../../common/clock.interface';
import { IOrderTransitionService } from '../../order/interfaces/order-transition.service.interface';
import { IOrder } from '../../order/interfaces/order.interface';
import { IOrderRepositoryRead } from '../../order/repository/order.repository.read';
import { IOrderRepositoryWrite } from '../../order/repository/order.repository.write';
import { ICardData, IPaymentGateway } from './payment.gateway.interface';
import { EPaymentMethod, IPayment } from './payment.interface';

export interface IParamsStartPayment {
  orderId: string;
  orderNumber: number;
  method: EPaymentMethod;
  amountInCents: number;
  changeForInCents?: number;
}

export interface IParamsChargeOrderCard {
  orderId: string;
  customerId: string;
  card: ICardData;
}

export interface IParamsApprovePix {
  orderId: string;
  customerId?: string;
}

export interface IParamsPaymentService {
  orderRepositoryRead: IOrderRepositoryRead;
  orderRepositoryWrite: IOrderRepositoryWrite;
  orderTransitionService: IOrderTransitionService;
  paymentGateway: IPaymentGateway;
  clock: IClock;
}

export interface IPaymentService {
  startPayment(params: IParamsStartPayment): Promise<IPayment>;
  chargeCard(params: IParamsChargeOrderCard): Promise<IOrder>;
  approvePix(params: IParamsApprovePix): Promise<IOrder>;
  expireUnpaidOrders(): Promise<number>;
  approvePendingPix(olderThanSeconds: number): Promise<number>;
}
