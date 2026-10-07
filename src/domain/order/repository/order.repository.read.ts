import {
  IPaginatedResult,
  IPagination,
} from '../../common/pagination.interface';
import { EOrderStatus, IOrder } from '../interfaces/order.interface';

export interface IParamsSearchOrders extends IPagination {
  status?: EOrderStatus;
  from?: Date;
  to?: Date;
  search?: string;
}

export interface IOrderRepositoryRead {
  findOrderById(id: string): Promise<IOrder | null>;
  findOrderByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<IOrder | null>;
  listOrdersByCustomer(
    customerId: string,
    pagination: IPagination,
  ): Promise<IPaginatedResult<IOrder>>;
  listActiveOrders(): Promise<IOrder[]>;
  searchOrders(params: IParamsSearchOrders): Promise<IPaginatedResult<IOrder>>;
  listOrdersAwaitingPaymentSince(
    createdBefore: Date,
    paymentMethods?: string[],
  ): Promise<IOrder[]>;
}
