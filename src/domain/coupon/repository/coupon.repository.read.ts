import { ICoupon } from '../interfaces/coupon.interface';

export interface IParamsListCoupons {
  isActive?: boolean;
}

export interface ICouponRepositoryRead {
  findCouponById(id: string): Promise<ICoupon | null>;
  findCouponByCode(code: string): Promise<ICoupon | null>;
  listCoupons(params: IParamsListCoupons): Promise<ICoupon[]>;
}
