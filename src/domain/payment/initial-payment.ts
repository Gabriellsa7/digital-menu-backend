import {
  EPaymentMethod,
  EPaymentStatus,
  IPayment,
} from './interfaces/payment.interface';

const ON_DELIVERY_METHODS = [
  EPaymentMethod.CASH_ON_DELIVERY,
  EPaymentMethod.CARD_ON_DELIVERY,
];

export function isPaidOnDelivery(method: EPaymentMethod): boolean {
  return ON_DELIVERY_METHODS.includes(method);
}

export function buildInitialPayment(
  method: EPaymentMethod,
  changeForInCents?: number,
): IPayment {
  return {
    method,
    status: isPaidOnDelivery(method)
      ? EPaymentStatus.ON_DELIVERY
      : EPaymentStatus.PENDING,
    ...(changeForInCents !== undefined && { changeForInCents }),
    failedAttempts: 0,
  };
}
