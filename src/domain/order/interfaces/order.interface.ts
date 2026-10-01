import { IPostalAddress } from '../../common/postal-address.interface';
import { ECouponType } from '../../coupon/interfaces/coupon.interface';
import { IPayment } from '../../payment/interfaces/payment.interface';

export enum EOrderStatus {
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  PLACED = 'PLACED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELED = 'CANCELED',
}

export enum EFulfillmentType {
  DELIVERY = 'DELIVERY',
  PICKUP = 'PICKUP',
}

export enum EOrderActorType {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  SYSTEM = 'SYSTEM',
}

export interface IOrderActor {
  type: EOrderActorType;
  id?: string;
}

export interface IOrderStatusEntry {
  status: EOrderStatus;
  at: Date;
  by: IOrderActor;
  reason?: string;
}

export interface IOrderItemOption {
  groupId: string;
  groupName: string;
  optionId: string;
  name: string;
  priceInCents: number;
  quantity: number;
}

export interface IOrderItem {
  productId: string;
  name: string;
  imageUrl?: string;
  unitPriceInCents: number;
  quantity: number;
  options: IOrderItemOption[];
  notes?: string;
  totalInCents: number;
}

export interface IOrderCustomerSnapshot {
  name: string;
  phone: string;
}

export interface IOrderDeliveryZoneSnapshot {
  id: string;
  name: string;
  feeInCents: number;
}

export interface IOrderCouponSnapshot {
  id: string;
  code: string;
  type: ECouponType;
  value: number;
}

export interface IOrder {
  id: string;
  number: number;
  customerId: string;
  customerSnapshot: IOrderCustomerSnapshot;
  items: IOrderItem[];
  fulfillmentType: EFulfillmentType;
  deliveryAddress?: IPostalAddress;
  deliveryZone?: IOrderDeliveryZoneSnapshot;
  subtotalInCents: number;
  deliveryFeeInCents: number;
  discountInCents: number;
  totalInCents: number;
  coupon?: IOrderCouponSnapshot;
  payment: IPayment;
  status: EOrderStatus;
  statusHistory: IOrderStatusEntry[];
  notes?: string;
  estimatedReadyAt?: Date;
  cancelReason?: string;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
}
