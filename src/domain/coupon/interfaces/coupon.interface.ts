export enum ECouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  FREE_DELIVERY = 'FREE_DELIVERY',
}

export interface ICoupon {
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
  updatedAt: Date;
}
