import { BusinessRuleError } from '../errors/business-rule.error';
import { ECouponType, ICoupon } from './interfaces/coupon.interface';

const COUPON_CODE_PATTERN = /^[A-Z0-9]{4,20}$/;

export class Coupon implements ICoupon {
  public readonly id: string;
  public readonly code: string;
  public readonly type: ECouponType;
  public readonly value: number;
  public readonly maxDiscountInCents?: number;
  public readonly minOrderInCents: number;
  public readonly startsAt: Date;
  public readonly expiresAt: Date;
  public readonly usageLimit?: number;
  public readonly usagePerCustomer: number;
  public readonly usedCount: number;
  public readonly firstOrderOnly: boolean;
  public readonly isActive: boolean;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: ICoupon) {
    this.id = props.id;
    this.code = Coupon.normalizeCode(props.code);
    this.type = props.type;
    this.value = props.value;
    this.maxDiscountInCents = props.maxDiscountInCents;
    this.minOrderInCents = props.minOrderInCents;
    this.startsAt = props.startsAt;
    this.expiresAt = props.expiresAt;
    this.usageLimit = props.usageLimit;
    this.usagePerCustomer = props.usagePerCustomer;
    this.usedCount = props.usedCount;
    this.firstOrderOnly = props.firstOrderOnly;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.assertInvariants();
  }

  static normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private assertInvariants(): void {
    if (!COUPON_CODE_PATTERN.test(this.code)) {
      throw new BusinessRuleError(
        'Coupon codes use 4 to 20 letters or numbers',
        'INVALID_COUPON_CODE',
      );
    }
    const isPercentage = this.type === ECouponType.PERCENTAGE;
    const isValueValid = isPercentage
      ? this.value >= 1 && this.value <= 100
      : this.type === ECouponType.FREE_DELIVERY || this.value > 0;
    if (!isValueValid) {
      throw new BusinessRuleError(
        isPercentage
          ? 'Percentage coupons need a value between 1 and 100'
          : 'Fixed coupons need a positive value',
        'INVALID_COUPON_VALUE',
      );
    }
    if (this.startsAt.getTime() >= this.expiresAt.getTime()) {
      throw new BusinessRuleError(
        'The coupon must start before it expires',
        'INVALID_COUPON_PERIOD',
      );
    }
  }
}
