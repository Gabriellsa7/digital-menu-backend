import { IOrderEventPublisher } from '../../domain/order/events/order.event.publisher';
import {
  EOrderStatus,
  IOrder,
} from '../../domain/order/interfaces/order.interface';
import {
  IOrderCreatedPayload,
  IOrderPaymentUpdatedPayload,
  IOrderStatusChangedPayload,
  WS_EVENTS,
  WS_ROOMS,
} from '../../interfaces/ws/ws.events';
import { SocketEmitter } from './socket.emitter';

export class SocketOrderPublisher implements IOrderEventPublisher {
  constructor(private readonly emitter: SocketEmitter) {}

  publishOrderCreated(order: IOrder): void {
    const payload: IOrderCreatedPayload = {
      orderId: order.id,
      number: order.number,
      totalInCents: order.totalInCents,
      itemsCount: order.items.reduce((total, { quantity }) => total + quantity, 0),
      fulfillmentType: order.fulfillmentType,
      createdAt: order.createdAt.toISOString(),
    };
    this.emitter.emit(
      [WS_ROOMS.storeStaff(order.storeId)],
      WS_EVENTS.ORDER_CREATED,
      payload,
    );
  }

  publishOrderStatusChanged(order: IOrder, previousStatus: EOrderStatus): void {
    const lastEntry = order.statusHistory[order.statusHistory.length - 1];
    const payload: IOrderStatusChangedPayload = {
      orderId: order.id,
      number: order.number,
      status: order.status,
      previousStatus,
      at: (lastEntry?.at ?? order.updatedAt).toISOString(),
      ...(order.estimatedReadyAt && {
        estimatedReadyAt: order.estimatedReadyAt.toISOString(),
      }),
      ...(lastEntry?.reason && { reason: lastEntry.reason }),
    };
    this.emitter.emit(
      [
        WS_ROOMS.storeStaff(order.storeId),
        WS_ROOMS.customer(order.customerId),
      ],
      WS_EVENTS.ORDER_STATUS_CHANGED,
      payload,
    );
  }

  publishOrderPaymentUpdated(order: IOrder): void {
    const payload: IOrderPaymentUpdatedPayload = {
      orderId: order.id,
      paymentStatus: order.payment.status,
    };
    this.emitter.emit(
      [
        WS_ROOMS.storeStaff(order.storeId),
        WS_ROOMS.customer(order.customerId),
      ],
      WS_EVENTS.ORDER_PAYMENT_UPDATED,
      payload,
    );
  }
}
