import { BusinessRuleError } from '../../errors/business-rule.error';
import {
  EOrderActorType,
  EOrderStatus,
  IOrder,
  IOrderActor,
} from '../interfaces/order.interface';
import {
  IOrderStatusTransition,
  ORDER_STATUS_TRANSITIONS,
} from '../order-status.transitions';

const CUSTOMER_CANCELABLE_STATUSES = [
  EOrderStatus.AWAITING_PAYMENT,
  EOrderStatus.PLACED,
];

export interface IParamsAssertTransition {
  order: Pick<IOrder, 'status' | 'fulfillmentType'>;
  to: EOrderStatus;
  actor: IOrderActor;
  reason?: string;
}

export function assertOrderTransition({
  order,
  to,
  actor,
  reason,
}: IParamsAssertTransition): IOrderStatusTransition {
  const transition = ORDER_STATUS_TRANSITIONS.find(
    (candidate) =>
      candidate.from === order.status &&
      candidate.to === to &&
      candidate.actors.includes(actor.type) &&
      (!candidate.fulfillmentType ||
        candidate.fulfillmentType === order.fulfillmentType),
  );
  if (!transition) {
    if (
      actor.type === EOrderActorType.CUSTOMER &&
      to === EOrderStatus.CANCELED &&
      !CUSTOMER_CANCELABLE_STATUSES.includes(order.status)
    ) {
      throw new BusinessRuleError(
        'The order can no longer be canceled',
        'CANNOT_CANCEL',
        { status: order.status },
      );
    }
    throw new BusinessRuleError(
      `Cannot move an order from ${order.status} to ${to}`,
      'INVALID_STATUS_TRANSITION',
      { from: order.status, to },
    );
  }
  if (transition.requiresReason && !reason?.trim()) {
    throw new BusinessRuleError('A reason is required', 'REASON_REQUIRED');
  }
  return transition;
}
