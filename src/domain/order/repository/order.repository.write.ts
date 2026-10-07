import { TTransactionContext } from '../../common/transaction.interface';
import { IPayment } from '../../payment/interfaces/payment.interface';
import {
  EOrderStatus,
  IOrder,
  IOrderStatusEntry,
} from '../interfaces/order.interface';

export interface IParamsUpdateOrderStatus {
  id: string;
  from: EOrderStatus;
  entry: IOrderStatusEntry;
  set?: Partial<Pick<IOrder, 'estimatedReadyAt' | 'cancelReason' | 'payment'>>;
}

export interface IOrderRepositoryWrite {
  createOrder(order: IOrder, context?: TTransactionContext): Promise<IOrder>;
  updateOrderStatus(
    params: IParamsUpdateOrderStatus,
    context?: TTransactionContext,
  ): Promise<IOrder | null>;
  updateOrderPayment(
    id: string,
    expectedStatus: EOrderStatus,
    payment: IPayment,
  ): Promise<IOrder | null>;
}
