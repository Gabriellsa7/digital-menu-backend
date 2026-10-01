export enum ECouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  FREE_DELIVERY = 'FREE_DELIVERY',
}

export interface ICoupon {
  id: string;
  code: string;
  type: ECouponType;
  /** Percent (1-100) for PERCENTAGE, cents for FIXED, unused for FREE_DELIVERY */
  value: number;
  maxDiscountInCents?: number;
  minOrderInCents: number;
  startsAt: Date;
  expiresAt: Date;
  /** Absent = unlimited */
  usageLimit?: number;
  usagePerCustomer: number;
  usedCount: number;
  firstOrderOnly: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
