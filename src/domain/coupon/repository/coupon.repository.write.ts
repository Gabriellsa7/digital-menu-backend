import { TTransactionContext } from '../../common/transaction.interface';
import { ICoupon } from '../interfaces/coupon.interface';

export type TOptionalCouponField = 'maxDiscountInCents' | 'usageLimit';

export interface IParamsUpdateCouponFields {
  set?: Partial<Omit<ICoupon, 'id' | 'createdAt' | 'updatedAt' | 'usedCount'>>;
  unset?: TOptionalCouponField[];
}

export interface ICouponRepositoryWrite {
  createCoupon(coupon: ICoupon): Promise<ICoupon>;
  updateCouponById(
    id: string,
    fields: IParamsUpdateCouponFields,
  ): Promise<ICoupon | null>;
  incrementCouponUsage(
    id: string,
    context?: TTransactionContext,
  ): Promise<boolean>;
  decrementCouponUsage(
    id: string,
    context?: TTransactionContext,
  ): Promise<void>;
}
