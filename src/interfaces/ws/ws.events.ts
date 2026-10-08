import { EFulfillmentType, EOrderStatus } from '../../domain/order/interfaces/order.interface';
import { EPaymentStatus } from '../../domain/payment/interfaces/payment.interface';
import { EManualStatus } from '../../domain/store/interfaces/store.interface';

export const WS_ROOMS = {
  storePublic: (storeId: string) => `store:${storeId}:public`,
  storeStaff: (storeId: string) => `store:${storeId}:staff`,
  customer: (customerId: string) => `customer:${customerId}`,
};

export const WS_EVENTS = {
  ORDER_CREATED: 'order.created',
  ORDER_STATUS_CHANGED: 'order.status_changed',
  ORDER_PAYMENT_UPDATED: 'order.payment_updated',
  STORE_STATUS_CHANGED: 'store.status_changed',
  PRODUCT_AVAILABILITY_CHANGED: 'product.availability_changed',
  OPTION_AVAILABILITY_CHANGED: 'option.availability_changed',
} as const;

export interface IOrderCreatedPayload {
  orderId: string;
  number: number;
  totalInCents: number;
  itemsCount: number;
  fulfillmentType: EFulfillmentType;
  createdAt: string;
}

export interface IOrderStatusChangedPayload {
  orderId: string;
  number: number;
  status: EOrderStatus;
  previousStatus: EOrderStatus;
  at: string;
  estimatedReadyAt?: string;
  reason?: string;
}

export interface IOrderPaymentUpdatedPayload {
  orderId: string;
  paymentStatus: EPaymentStatus;
}

export interface IStoreStatusChangedPayload {
  isOpenNow: boolean;
  manualStatus: EManualStatus;
  nextOpeningAt?: string;
  closesAt?: string;
}

export interface IProductAvailabilityChangedPayload {
  productId: string;
  isAvailable: boolean;
}

export interface IOptionAvailabilityChangedPayload {
  optionGroupId: string;
  optionId: string;
  isAvailable: boolean;
}
