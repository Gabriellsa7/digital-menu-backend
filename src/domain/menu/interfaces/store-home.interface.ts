import { ECouponType } from '../../coupon/interfaces/coupon.interface';
import { IMenuProduct } from './menu.interface';

export interface IPublicCoupon {
  code: string;
  type: ECouponType;
  value: number;
  maxDiscountInCents?: number;
  minOrderInCents: number;
  firstOrderOnly: boolean;
  expiresAt: Date;
}

export interface IStoreHomeCategory {
  id: string;
  name: string;
  productCount: number;
}

export interface IStoreHome {
  featured: IMenuProduct[];
  promotions: IMenuProduct[];
  bestSellers: { product: IMenuProduct; soldCount: number }[];
  newArrivals: IMenuProduct[];
  publicCoupons: IPublicCoupon[];
  categories: IStoreHomeCategory[];
}
