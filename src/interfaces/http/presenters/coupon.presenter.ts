import {
  ECouponType,
  ICoupon,
} from '../../../domain/coupon/interfaces/coupon.interface';
import { ICouponValidation } from '../../../domain/coupon/interfaces/coupon.service.interface';

export interface ICouponResponse {
  id: string;
  code: string;
  type: ECouponType;
  value: number;
  maxDiscountInCents?: number;
  minOrderInCents: number;
  startsAt: Date;
  expiresAt: Date;
  usageLimit?: number;
  usagePerCustomer: number;
  usedCount: number;
  firstOrderOnly: boolean;
  isActive: boolean;
  createdAt: Date;
}

export function toCouponResponse(coupon: ICoupon): ICouponResponse {
  return {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    ...(coupon.maxDiscountInCents !== undefined && {
      maxDiscountInCents: coupon.maxDiscountInCents,
    }),
    minOrderInCents: coupon.minOrderInCents,
    startsAt: coupon.startsAt,
    expiresAt: coupon.expiresAt,
    ...(coupon.usageLimit !== undefined && { usageLimit: coupon.usageLimit }),
    usagePerCustomer: coupon.usagePerCustomer,
    usedCount: coupon.usedCount,
    firstOrderOnly: coupon.firstOrderOnly,
    isActive: coupon.isActive,
    createdAt: coupon.createdAt,
  };
}

export function toCouponValidationResponse({
  coupon,
  discountInCents,
}: ICouponValidation) {
  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    discountInCents,
  };
}
