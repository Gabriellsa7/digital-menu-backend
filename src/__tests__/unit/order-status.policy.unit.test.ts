import { assertOrderTransition } from '../../domain/order/policies/order-status.policy';
import { Order } from '../../domain/order/order.entity';
import {
  EFulfillmentType,
  EOrderActorType,
  EOrderStatus,
  IOrder,
} from '../../domain/order/interfaces/order.interface';

const { DELIVERY, PICKUP } = EFulfillmentType;
const { CUSTOMER, STAFF, SYSTEM } = EOrderActorType;
const {
  AWAITING_PAYMENT,
  PLACED,
  PREPARING,
  READY,
  OUT_FOR_DELIVERY,
  COMPLETED,
  REJECTED,
  CANCELED,
} = EOrderStatus;

const ANY = undefined;

const ALLOWED: [
  EOrderStatus,
  EOrderStatus,
  EOrderActorType,
  EFulfillmentType | undefined,
][] = [
  [AWAITING_PAYMENT, PLACED, SYSTEM, ANY],
  [AWAITING_PAYMENT, PLACED, CUSTOMER, ANY],
  [AWAITING_PAYMENT, CANCELED, SYSTEM, ANY],
  [AWAITING_PAYMENT, CANCELED, CUSTOMER, ANY],
  [PLACED, PREPARING, STAFF, ANY],
  [PLACED, REJECTED, STAFF, ANY],
  [PLACED, CANCELED, CUSTOMER, ANY],
  [PREPARING, READY, STAFF, ANY],
  [PREPARING, CANCELED, STAFF, ANY],
  [READY, OUT_FOR_DELIVERY, STAFF, DELIVERY],
  [READY, COMPLETED, STAFF, PICKUP],
  [READY, CANCELED, STAFF, ANY],
  [OUT_FOR_DELIVERY, COMPLETED, STAFF, ANY],
];

const ALL_STATUSES = Object.values(EOrderStatus);
const ALL_ACTORS = Object.values(EOrderActorType);

function isAllowed(
  from: EOrderStatus,
  to: EOrderStatus,
  actor: EOrderActorType,
  fulfillmentType: EFulfillmentType,
): boolean {
  return ALLOWED.some(
    ([f, t, a, ft]) =>
      f === from &&
      t === to &&
      a === actor &&
      (ft === ANY || ft === fulfillmentType),
  );
}

describe('When we check the full status matrix (ORD-R13..R15)', () => {
  const cases = ALL_STATUSES.flatMap((from) =>
    ALL_STATUSES.flatMap((to) =>
      ALL_ACTORS.flatMap((actor) =>
        [DELIVERY, PICKUP].map(
          (fulfillmentType) =>
            [from, to, actor, fulfillmentType] as [
              EOrderStatus,
              EOrderStatus,
              EOrderActorType,
              EFulfillmentType,
            ],
        ),
      ),
    ),
  );

  it.each(cases)(
    '%s → %s by %s (%s)',
    (from, to, actor, fulfillmentType) => {
      const attempt = () =>
        assertOrderTransition({
          order: { status: from, fulfillmentType },
          to,
          actor: { type: actor },
          reason: 'Out of stock',
        });

      if (isAllowed(from, to, actor, fulfillmentType)) {
        expect(attempt).not.toThrow();
      } else {
        expect(attempt).toThrow(
          expect.objectContaining({
            code: expect.stringMatching(
              /^(INVALID_STATUS_TRANSITION|CANNOT_CANCEL)$/,
            ),
          }),
        );
      }
    },
  );
});

describe('When a customer cancels too late (ORD-R15)', () => {
  it.each([PREPARING, READY, OUT_FOR_DELIVERY])(
    'should throw CANNOT_CANCEL from %s',
    (status) => {
      expect(() =>
        assertOrderTransition({
          order: { status, fulfillmentType: DELIVERY },
          to: CANCELED,
          actor: { type: CUSTOMER },
        }),
      ).toThrow(expect.objectContaining({ code: 'CANNOT_CANCEL' }));
    },
  );
});

describe('When staff rejects or cancels without a reason (ORD-R14)', () => {
  it.each([
    [PLACED, REJECTED],
    [PREPARING, CANCELED],
    [READY, CANCELED],
  ])('should require a reason from %s to %s', (status, to) => {
    expect(() =>
      assertOrderTransition({
        order: { status, fulfillmentType: PICKUP },
        to,
        actor: { type: STAFF },
        reason: '  ',
      }),
    ).toThrow(expect.objectContaining({ code: 'REASON_REQUIRED' }));
  });
});

describe('When we check whether an order holds a coupon use (CPN-R09)', () => {
  function anOrder(status: EOrderStatus, withCoupon = true): Order {
    return new Order({
      status,
      ...(withCoupon && {
        coupon: { id: 'c', code: 'OFF10', type: 'FIXED', value: 10 },
      }),
    } as unknown as IOrder);
  }

  it.each([
    [PLACED, true, true],
    [PREPARING, true, true],
    [AWAITING_PAYMENT, true, false],
    [CANCELED, true, false],
    [PLACED, false, false],
  ])('%s with coupon=%s → %s', (status, withCoupon, expected) => {
    expect(anOrder(status, withCoupon).holdsCouponUse()).toBe(expected);
  });
});
