import { ICoupon } from '../interfaces/coupon.interface';

export interface IParamsListCoupons {
  isActive?: boolean;
}

export interface ICouponRepositoryRead {
  findCouponById(id: string): Promise<ICoupon | null>;
  findCouponByCode(storeId: string, code: string): Promise<ICoupon | null>;
  listCoupons(
    storeId: string,
    params: IParamsListCoupons,
  ): Promise<ICoupon[]>;
}
