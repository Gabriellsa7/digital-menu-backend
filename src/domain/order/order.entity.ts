import { IPostalAddress } from '../common/postal-address.interface';
import { IPayment } from '../payment/interfaces/payment.interface';
import {
  EFulfillmentType,
  EOrderStatus,
  IOrder,
  IOrderCouponSnapshot,
  IOrderCustomerSnapshot,
  IOrderDeliveryZoneSnapshot,
  IOrderItem,
  IOrderStatusEntry,
} from './interfaces/order.interface';
import { FINAL_ORDER_STATUSES } from './order-status.transitions';

export class Order implements IOrder {
  public readonly id: string;
  public readonly number: number;
  public readonly customerId: string;
  public readonly customerSnapshot: IOrderCustomerSnapshot;
  public readonly items: IOrderItem[];
  public readonly fulfillmentType: EFulfillmentType;
  public readonly deliveryAddress?: IPostalAddress;
  public readonly deliveryZone?: IOrderDeliveryZoneSnapshot;
  public readonly subtotalInCents: number;
  public readonly deliveryFeeInCents: number;
  public readonly discountInCents: number;
  public readonly totalInCents: number;
  public readonly coupon?: IOrderCouponSnapshot;
  public readonly payment: IPayment;
  public readonly status: EOrderStatus;
  public readonly statusHistory: IOrderStatusEntry[];
  public readonly notes?: string;
  public readonly estimatedReadyAt?: Date;
  public readonly cancelReason?: string;
  public readonly idempotencyKey?: string;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: IOrder) {
    this.id = props.id;
    this.number = props.number;
    this.customerId = props.customerId;
    this.customerSnapshot = props.customerSnapshot;
    this.items = props.items;
    this.fulfillmentType = props.fulfillmentType;
    this.deliveryAddress = props.deliveryAddress;
    this.deliveryZone = props.deliveryZone;
    this.subtotalInCents = props.subtotalInCents;
    this.deliveryFeeInCents = props.deliveryFeeInCents;
    this.discountInCents = props.discountInCents;
    this.totalInCents = props.totalInCents;
    this.coupon = props.coupon;
    this.payment = props.payment;
    this.status = props.status;
    this.statusHistory = props.statusHistory;
    this.notes = props.notes;
    this.estimatedReadyAt = props.estimatedReadyAt;
    this.cancelReason = props.cancelReason;
    this.idempotencyKey = props.idempotencyKey;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isFinal(): boolean {
    return FINAL_ORDER_STATUSES.includes(this.status);
  }

  holdsCouponUse(): boolean {
    return (
      this.coupon !== undefined &&
      this.status !== EOrderStatus.AWAITING_PAYMENT &&
      !this.isFinal()
    );
  }
}
