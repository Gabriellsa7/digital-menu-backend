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

  async findCouponByCode(
    storeId: string,
    code: string,
  ): Promise<ICoupon | null> {
    return Mcoupon.findOne(
      { storeId, code },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<ICoupon>();
  }

  async listCoupons(
    storeId: string,
    { isActive }: IParamsListCoupons,
  ): Promise<ICoupon[]> {
    return Mcoupon.find(
      { storeId, ...(isActive !== undefined && { isActive }) },
      HIDE_MONGO_INTERNAL_FIELDS,
    )
      .sort({ createdAt: -1 })
      .lean<ICoupon[]>();
  }
}
