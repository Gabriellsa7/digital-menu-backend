import { randomUUID } from 'crypto';
import {
  EFulfillmentType,
  EOrderActorType,
  EOrderStatus,
  IOrder,
} from '../../domain/order/interfaces/order.interface';
import {
  EPaymentMethod,
  EPaymentStatus,
} from '../../domain/payment/interfaces/payment.interface';

export function anOrderFixture(overrides: Partial<IOrder> = {}): IOrder {
  const now = new Date();
  const status = overrides.status ?? EOrderStatus.PLACED;
  return {
    id: randomUUID(),
    number: Math.floor(Math.random() * 1e9),
    customerId: 'customer-1',
    customerSnapshot: { name: 'Nami', phone: '+5511999998888' },
    items: [
      {
        productId: 'smash',
        name: 'Smash',
        unitPriceInCents: 3000,
        quantity: 1,
        options: [],
        totalInCents: 3000,
      },
    ],
    fulfillmentType: EFulfillmentType.PICKUP,
    subtotalInCents: 3000,
    deliveryFeeInCents: 0,
    discountInCents: 0,
    totalInCents: 3000,
    payment: {
      method: EPaymentMethod.CASH_ON_DELIVERY,
      status: EPaymentStatus.ON_DELIVERY,
      failedAttempts: 0,
    },
    status,
    statusHistory: [
      { status, at: now, by: { type: EOrderActorType.CUSTOMER } },
    ],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}
