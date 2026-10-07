import { ICoupon } from '../../../domain/coupon/interfaces/coupon.interface';
import {
  ICouponRepositoryRead,
  IParamsListCoupons,
} from '../../../domain/coupon/repository/coupon.repository.read';
import { Mcoupon } from '../../db/mongo/models/coupon.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class CouponRepositoryRead implements ICouponRepositoryRead {
  async findCouponById(id: string): Promise<ICoupon | null> {
    return Mcoupon.findOne({ id }, HIDE_MONGO_INTERNAL_FIELDS).lean<ICoupon>();
  }

  async findCouponByCode(code: string): Promise<ICoupon | null> {
    return Mcoupon.findOne(
      { code },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<ICoupon>();
  }

  async listCoupons({ isActive }: IParamsListCoupons): Promise<ICoupon[]> {
    return Mcoupon.find(
      isActive === undefined ? {} : { isActive },
      HIDE_MONGO_INTERNAL_FIELDS,
    )
      .sort({ createdAt: -1 })
      .lean<ICoupon[]>();
  }
}
