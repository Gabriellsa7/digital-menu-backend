import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { IClock } from '../../common/clock.interface';
import { TTransactionContext } from '../../common/transaction.interface';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { ConflictError } from '../../errors/conflict.error';
import { NotFoundError } from '../../errors/not-found.error';
import { Coupon } from '../coupon.entity';
import { ICoupon } from '../interfaces/coupon.interface';
import {
  ICouponService,
  ICouponValidation,
  IParamsCouponData,
  IParamsCouponService,
  IParamsUpdateCoupon,
  IParamsValidateCoupon,
} from '../interfaces/coupon.service.interface';
import { ICustomerCouponUsage } from '../interfaces/customer-coupon-usage.interface';
import {
  assertCouponApplicable,
  calculateCouponDiscount,
} from '../policies/coupon.policy';
import { ICouponRepositoryRead } from '../repository/coupon.repository.read';
import {
  ICouponRepositoryWrite,
  IParamsUpdateCouponFields,
} from '../repository/coupon.repository.write';

export class CouponService implements ICouponService {
  private couponRepositoryRead: ICouponRepositoryRead;
  private couponRepositoryWrite: ICouponRepositoryWrite;
  private customerCouponUsage: ICustomerCouponUsage;
  private clock: IClock;

  constructor({
    couponRepositoryRead,
    couponRepositoryWrite,
    customerCouponUsage,
    clock,
  }: IParamsCouponService) {
    this.couponRepositoryRead = couponRepositoryRead;
    this.couponRepositoryWrite = couponRepositoryWrite;
    this.customerCouponUsage = customerCouponUsage;
    this.clock = clock;
  }

  @ErrorHandler()
  async listCoupons(storeId: string, isActive?: boolean): Promise<ICoupon[]> {
    return this.couponRepositoryRead.listCoupons(storeId, { isActive });
  }

  @ErrorHandler()
  async getCouponById(storeId: string, id: string): Promise<ICoupon> {
    const coupon = await this.couponRepositoryRead.findCouponById(id);

    return coupon?.storeId === storeId ? coupon : this.throwCouponNotFound();
  }

  @ErrorHandler()
  async createCoupon(params: IParamsCouponData): Promise<ICoupon> {
    const now = this.clock.now();
    const coupon = new Coupon({
      ...params,
      id: randomUUID(),
      usedCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    await this.assertUniqueCode(coupon);

    return this.couponRepositoryWrite.createCoupon(coupon);
  }

  @ErrorHandler()
  async updateCoupon({
    id,
    ...params
  }: IParamsUpdateCoupon): Promise<ICoupon> {
    const current = await this.getCouponById(params.storeId, id);
    const coupon = new Coupon({
      ...current,
      ...params,
      maxDiscountInCents: params.maxDiscountInCents,
      usageLimit: params.usageLimit,
    });
    await this.assertUniqueCode(coupon);

    const { maxDiscountInCents, usageLimit } = coupon;
    return this.updateCouponFields(id, {
      set: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minOrderInCents: coupon.minOrderInCents,
        startsAt: coupon.startsAt,
        expiresAt: coupon.expiresAt,
        usagePerCustomer: coupon.usagePerCustomer,
        firstOrderOnly: coupon.firstOrderOnly,
        isActive: coupon.isActive,
        isPublic: coupon.isPublic,
        ...(maxDiscountInCents !== undefined && { maxDiscountInCents }),
        ...(usageLimit !== undefined && { usageLimit }),
      },
      unset: [
        ...(maxDiscountInCents === undefined
          ? (['maxDiscountInCents'] as const)
          : []),
        ...(usageLimit === undefined ? (['usageLimit'] as const) : []),
      ],
    });
  }

  @ErrorHandler()
  async setCouponActive(
    storeId: string,
    id: string,
    isActive: boolean,
  ): Promise<ICoupon> {
    await this.getCouponById(storeId, id);
    return this.updateCouponFields(id, { set: { isActive } });
  }

  @ErrorHandler()
  async validateCouponForCustomer({
    storeId,
    code,
    customerId,
    subtotalInCents,
    deliveryFeeInCents,
    fulfillmentType,
  }: IParamsValidateCoupon): Promise<ICouponValidation> {
    const coupon = await this.couponRepositoryRead.findCouponByCode(
      storeId,
      Coupon.normalizeCode(code),
    );
    if (!coupon) {
      throw new BusinessRuleError('Coupon not found', 'COUPON_NOT_FOUND');
    }
    const [customerUses, hasCompletedOrder] = await Promise.all([
      this.customerCouponUsage.countCouponUsesByCustomer(customerId, coupon.id),
      this.customerCouponUsage.hasCompletedOrder(customerId),
    ]);
    const context = {
      now: this.clock.now(),
      subtotalInCents,
      deliveryFeeInCents,
      fulfillmentType,
      customerUses,
      hasCompletedOrder,
    };
    assertCouponApplicable(coupon, context);

    return {
      coupon,
      discountInCents: calculateCouponDiscount(coupon, context),
    };
  }

  @ErrorHandler()
  async reserveCouponUse(
    couponId: string,
    context?: TTransactionContext,
  ): Promise<void> {
    const reserved = await this.couponRepositoryWrite.incrementCouponUsage(
      couponId,
      context,
    );
    if (!reserved) {
      throw new BusinessRuleError('Coupon is exhausted', 'COUPON_EXHAUSTED');
    }
  }

  @ErrorHandler()
  async releaseCouponUse(
    couponId: string,
    context?: TTransactionContext,
  ): Promise<void> {
    await this.couponRepositoryWrite.decrementCouponUsage(couponId, context);
  }

  private async assertUniqueCode(coupon: ICoupon): Promise<void> {
    const existing = await this.couponRepositoryRead.findCouponByCode(
      coupon.storeId,
      coupon.code,
    );
    if (existing && existing.id !== coupon.id) {
      throw new ConflictError(
        'A coupon with this code already exists',
        'COUPON_CODE_IN_USE',
      );
    }
  }

  private async updateCouponFields(
    id: string,
    fields: IParamsUpdateCouponFields,
  ): Promise<ICoupon> {
    const updated = await this.couponRepositoryWrite.updateCouponById(
      id,
      fields,
    );

    return updated ? updated : this.throwCouponNotFound();
  }

  private throwCouponNotFound(): never {
    throw new NotFoundError('Coupon not found');
  }
}
