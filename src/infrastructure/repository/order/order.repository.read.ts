import { RootFilterQuery } from 'mongoose';
import {
  IPaginatedResult,
  IPagination,
} from '../../../domain/common/pagination.interface';
import { ICustomerCouponUsage } from '../../../domain/coupon/interfaces/customer-coupon-usage.interface';
import {
  EOrderStatus,
  IOrder,
} from '../../../domain/order/interfaces/order.interface';
import { ACTIVE_ORDER_STATUSES } from '../../../domain/order/order-status.transitions';
import {
  IOrderRepositoryRead,
  IParamsSearchOrders,
} from '../../../domain/order/repository/order.repository.read';
import { Morder } from '../../db/mongo/models/order.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';
import { IMOrder } from '../../db/mongo/schema/order.schema';

const RELEASED_COUPON_STATUSES = [EOrderStatus.CANCELED, EOrderStatus.REJECTED];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class OrderRepositoryRead
  implements IOrderRepositoryRead, ICustomerCouponUsage
{
  async findOrderById(id: string): Promise<IOrder | null> {
    return Morder.findOne({ id }, HIDE_MONGO_INTERNAL_FIELDS).lean<IOrder>();
  }

  async findOrderByIdempotencyKey(
    customerId: string,
    idempotencyKey: string,
  ): Promise<IOrder | null> {
    return Morder.findOne(
      { customerId, idempotencyKey },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IOrder>();
  }

  async listOrdersByCustomer(
    customerId: string,
    pagination: IPagination,
    storeId?: string,
  ): Promise<IPaginatedResult<IOrder>> {
    return this.paginate(
      { customerId, ...(storeId && { storeId }) },
      pagination,
    );
  }

  async listActiveOrders(storeId: string): Promise<IOrder[]> {
    return Morder.find(
      { storeId, status: { $in: ACTIVE_ORDER_STATUSES } },
      HIDE_MONGO_INTERNAL_FIELDS,
    )
      .sort({ createdAt: 1 })
      .lean<IOrder[]>();
  }

  async searchOrders({
    storeId,
    status,
    from,
    to,
    search,
    limit,
    offset,
  }: IParamsSearchOrders): Promise<IPaginatedResult<IOrder>> {
    const term = search?.trim();
    const filter: RootFilterQuery<IMOrder> = {
      storeId,
      ...(status && { status }),
      ...((from || to) && {
        createdAt: { ...(from && { $gte: from }), ...(to && { $lte: to }) },
      }),
      ...(term && {
        $or: [
          ...(/^\d+$/.test(term) ? [{ number: Number(term) }] : []),
          {
            'customerSnapshot.name': {
              $regex: escapeRegex(term),
              $options: 'i',
            },
          },
        ],
      }),
    };
    return this.paginate(filter, { limit, offset });
  }

  async listOrdersAwaitingPaymentSince(
    createdBefore: Date,
    paymentMethods?: string[],
  ): Promise<IOrder[]> {
    return Morder.find(
      {
        status: EOrderStatus.AWAITING_PAYMENT,
        createdAt: { $lte: createdBefore },
        ...(paymentMethods && { 'payment.method': { $in: paymentMethods } }),
      },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IOrder[]>();
  }

  async countCouponUsesByCustomer(
    customerId: string,
    couponId: string,
  ): Promise<number> {
    return Morder.countDocuments({
      customerId,
      'coupon.id': couponId,
      status: { $nin: RELEASED_COUPON_STATUSES },
    });
  }

  async hasCompletedOrder(
    customerId: string,
    storeId: string,
  ): Promise<boolean> {
    const order = await Morder.exists({
      customerId,
      storeId,
      status: EOrderStatus.COMPLETED,
    });
    return order !== null;
  }

  private async paginate(
    filter: RootFilterQuery<IMOrder>,
    { limit, offset }: IPagination,
  ): Promise<IPaginatedResult<IOrder>> {
    const [items, total] = await Promise.all([
      Morder.find(filter, HIDE_MONGO_INTERNAL_FIELDS)
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean<IOrder[]>(),
      Morder.countDocuments(filter),
    ]);
    return { items, total };
  }
}
