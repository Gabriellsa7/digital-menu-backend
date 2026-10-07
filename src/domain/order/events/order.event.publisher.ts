import { IOrder, IOrderStatusEntry } from '../interfaces/order.interface';

export interface IOrderEventPublisher {
  publishOrderCreated(order: IOrder): void;
  publishOrderStatusChanged(
    order: IOrder,
    previousStatus: IOrderStatusEntry['status'],
  ): void;
  publishOrderPaymentUpdated(order: IOrder): void;
}
