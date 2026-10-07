import { TTransactionContext } from '../../../domain/common/transaction.interface';
import {
  EOrderStatus,
  IOrder,
} from '../../../domain/order/interfaces/order.interface';
import {
  IOrderRepositoryWrite,
  IParamsUpdateOrderStatus,
} from '../../../domain/order/repository/order.repository.write';
import { IPayment } from '../../../domain/payment/interfaces/payment.interface';
import { Morder } from '../../db/mongo/models/order.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';
import { toSession } from '../../db/mongo/transaction';

export class OrderRepositoryWrite implements IOrderRepositoryWrite {
  async createOrder(
    order: IOrder,
    context?: TTransactionContext,
  ): Promise<IOrder> {
    const [created] = await Morder.create([{ ...order }], {
      session: toSession(context),
    });
    const { _id, __v, ...createdOrder } = created.toObject();
    return createdOrder;
  }

  async updateOrderStatus(
    { id, from, entry, set = {} }: IParamsUpdateOrderStatus,
    context?: TTransactionContext,
  ): Promise<IOrder | null> {
    return Morder.findOneAndUpdate(
      { id, status: from },
      {
        $set: { ...set, status: entry.status },
        $push: { statusHistory: entry },
      },
      {
        new: true,
        projection: HIDE_MONGO_INTERNAL_FIELDS,
        session: toSession(context),
      },
    ).lean<IOrder>();
  }

  async updateOrderPayment(
    id: string,
    expectedStatus: EOrderStatus,
    payment: IPayment,
  ): Promise<IOrder | null> {
    return Morder.findOneAndUpdate(
      { id, status: expectedStatus },
      { $set: { payment } },
      { new: true, projection: HIDE_MONGO_INTERNAL_FIELDS },
    ).lean<IOrder>();
  }
}
