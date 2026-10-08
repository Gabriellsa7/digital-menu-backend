import {
  EFulfillmentType,
  EOrderActorType,
  EOrderStatus,
} from './interfaces/order.interface';

export interface IOrderStatusTransition {
  from: EOrderStatus;
  to: EOrderStatus;
  actors: EOrderActorType[];
  fulfillmentType?: EFulfillmentType;
  requiresReason?: boolean;
}

const { CUSTOMER, STAFF, SYSTEM } = EOrderActorType;

export const ORDER_STATUS_TRANSITIONS: IOrderStatusTransition[] = [
  {
    from: EOrderStatus.AWAITING_PAYMENT,
    to: EOrderStatus.PLACED,
    actors: [CUSTOMER, SYSTEM],
  },
  {
    from: EOrderStatus.AWAITING_PAYMENT,
    to: EOrderStatus.CANCELED,
    actors: [CUSTOMER, SYSTEM],
  },
  { from: EOrderStatus.PLACED, to: EOrderStatus.PREPARING, actors: [STAFF] },
  {
    from: EOrderStatus.PLACED,
    to: EOrderStatus.REJECTED,
    actors: [STAFF],
    requiresReason: true,
  },
  { from: EOrderStatus.PLACED, to: EOrderStatus.CANCELED, actors: [CUSTOMER] },
  { from: EOrderStatus.PREPARING, to: EOrderStatus.READY, actors: [STAFF] },
  {
    from: EOrderStatus.PREPARING,
    to: EOrderStatus.CANCELED,
    actors: [STAFF],
    requiresReason: true,
  },
  {
    from: EOrderStatus.READY,
    to: EOrderStatus.OUT_FOR_DELIVERY,
    actors: [STAFF],
    fulfillmentType: EFulfillmentType.DELIVERY,
  },
  {
    from: EOrderStatus.READY,
    to: EOrderStatus.COMPLETED,
    actors: [STAFF],
    fulfillmentType: EFulfillmentType.PICKUP,
  },
  {
    from: EOrderStatus.READY,
    to: EOrderStatus.CANCELED,
    actors: [STAFF],
    requiresReason: true,
  },
  {
    from: EOrderStatus.OUT_FOR_DELIVERY,
    to: EOrderStatus.COMPLETED,
    actors: [STAFF],
  },
];

export const FINAL_ORDER_STATUSES = [
  EOrderStatus.COMPLETED,
  EOrderStatus.REJECTED,
  EOrderStatus.CANCELED,
];

export const ACTIVE_ORDER_STATUSES = [
  EOrderStatus.PLACED,
  EOrderStatus.PREPARING,
  EOrderStatus.READY,
  EOrderStatus.OUT_FOR_DELIVERY,
];
