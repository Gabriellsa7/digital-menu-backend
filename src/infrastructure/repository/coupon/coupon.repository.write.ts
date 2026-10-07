import { UpdateQuery } from 'mongoose';
import { TTransactionContext } from '../../../domain/common/transaction.interface';
import { ICoupon } from '../../../domain/coupon/interfaces/coupon.interface';
import {
  ICouponRepositoryWrite,
  IParamsUpdateCouponFields,
} from '../../../domain/coupon/repository/coupon.repository.write';
import { Mcoupon } from '../../db/mongo/models/coupon.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';
import { IMCoupon } from '../../db/mongo/schema/coupon.schema';
import { toSession } from '../../db/mongo/transaction';

export class CouponRepositoryWrite implements ICouponRepositoryWrite {
  async createCoupon(coupon: ICoupon): Promise<ICoupon> {
    const created = await Mcoupon.create({ ...coupon });
    const { _id, __v, ...createdCoupon } = created.toObject();
    return createdCoupon;
  }

  async updateCouponById(
    id: string,
    { set = {}, unset = [] }: IParamsUpdateCouponFields,
  ): Promise<ICoupon | null> {
    const update: UpdateQuery<IMCoupon> = {};
    if (Object.keys(set).length > 0) {
      update.$set = set;
    }
    if (unset.length > 0) {
      update.$unset = Object.fromEntries(unset.map((field) => [field, '']));
    }
    return Mcoupon.findOneAndUpdate({ id }, update, {
      new: true,
      projection: HIDE_MONGO_INTERNAL_FIELDS,
    }).lean<ICoupon>();
  }

  async incrementCouponUsage(
    id: string,
    context?: TTransactionContext,
  ): Promise<boolean> {
    const { modifiedCount } = await Mcoupon.updateOne(
      {
        id,
        $or: [
          { usageLimit: { $exists: false } },
          { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
        ],
      },
      { $inc: { usedCount: 1 } },
      { session: toSession(context) },
    );
    return modifiedCount === 1;
  }

  async decrementCouponUsage(
    id: string,
    context?: TTransactionContext,
  ): Promise<void> {
    await Mcoupon.updateOne(
      { id, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
      { session: toSession(context) },
    );
  }
}
