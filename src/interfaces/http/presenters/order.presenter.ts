import {
  IOrder,
  IOrderItem,
} from '../../../domain/order/interfaces/order.interface';
import { IPayment } from '../../../domain/payment/interfaces/payment.interface';
import { IOrderQuote } from '../../../domain/order/interfaces/order-pricing.service.interface';

function toOrderItemResponse(item: IOrderItem): IOrderItem {
  return {
    productId: item.productId,
    name: item.name,
    ...(item.imageUrl && { imageUrl: item.imageUrl }),
    unitPriceInCents: item.unitPriceInCents,
    quantity: item.quantity,
    options: item.options.map((option) => ({
      groupId: option.groupId,
      groupName: option.groupName,
      optionId: option.optionId,
      name: option.name,
      priceInCents: option.priceInCents,
      quantity: option.quantity,
    })),
    ...(item.notes && { notes: item.notes }),
    totalInCents: item.totalInCents,
  };
}

export function toOrderQuoteResponse(quote: IOrderQuote) {
  return { ...quote, items: quote.items.map(toOrderItemResponse) };
}

function toPaymentResponse({ pix, paidAt, ...payment }: IPayment) {
  return {
    ...payment,
    ...(pix && { pix: { ...pix, expiresAt: pix.expiresAt.toISOString() } }),
    ...(paidAt && { paidAt: paidAt.toISOString() }),
  };
}

export function toOrderResponse(order: IOrder) {
  const { idempotencyKey, updatedAt, ...response } = order;
  return {
    ...response,
    payment: toPaymentResponse(order.payment),
    items: order.items.map(toOrderItemResponse),
    statusHistory: order.statusHistory.map(({ status, at, by, reason }) => ({
      status,
      at: at.toISOString(),
      by: { type: by.type, ...(by.id && { id: by.id }) },
      ...(reason && { reason }),
    })),
  };
}

export function toOrderSummaryResponse(order: IOrder) {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    fulfillmentType: order.fulfillmentType,
    totalInCents: order.totalInCents,
    itemsCount: order.items.reduce((total, item) => total + item.quantity, 0),
    paymentMethod: order.payment.method,
    paymentStatus: order.payment.status,
    customerName: order.customerSnapshot.name,
    createdAt: order.createdAt,
  };
}
