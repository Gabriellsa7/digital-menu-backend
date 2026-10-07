import { IClock } from '../../common/clock.interface';
import { TTransactionContext } from '../../common/transaction.interface';
import { EFulfillmentType } from '../../order/interfaces/order.interface';
import { ICouponRepositoryRead } from '../repository/coupon.repository.read';
import { ICouponRepositoryWrite } from '../repository/coupon.repository.write';
import { ECouponType, ICoupon } from './coupon.interface';
import { ICustomerCouponUsage } from './customer-coupon-usage.interface';

export interface IParamsCouponData {
  code: string;
  type: ECouponType;
  value: number;
  maxDiscountInCents?: number;
  minOrderInCents: number;
  startsAt: Date;
  expiresAt: Date;
  usageLimit?: number;
  usagePerCustomer: number;
  firstOrderOnly: boolean;
  isActive: boolean;
}

export interface IParamsUpdateCoupon extends IParamsCouponData {
  id: string;
}

export interface IParamsValidateCoupon {
  code: string;
  customerId: string;
  subtotalInCents: number;
  deliveryFeeInCents: number;
  fulfillmentType: EFulfillmentType;
}

export interface ICouponValidation {
  coupon: ICoupon;
  discountInCents: number;
}

export interface IParamsCouponService {
  couponRepositoryRead: ICouponRepositoryRead;
  couponRepositoryWrite: ICouponRepositoryWrite;
  customerCouponUsage: ICustomerCouponUsage;
  clock: IClock;
}

export interface ICouponService {
  listCoupons(isActive?: boolean): Promise<ICoupon[]>;
  getCouponById(id: string): Promise<ICoupon>;
  createCoupon(params: IParamsCouponData): Promise<ICoupon>;
  updateCoupon(params: IParamsUpdateCoupon): Promise<ICoupon>;
  setCouponActive(id: string, isActive: boolean): Promise<ICoupon>;
  validateCouponForCustomer(
    params: IParamsValidateCoupon,
  ): Promise<ICouponValidation>;
  reserveCouponUse(
    couponId: string,
    context?: TTransactionContext,
  ): Promise<void>;
  releaseCouponUse(
    couponId: string,
    context?: TTransactionContext,
  ): Promise<void>;
}
