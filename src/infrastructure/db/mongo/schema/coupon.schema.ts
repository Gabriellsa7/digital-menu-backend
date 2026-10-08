import mongoose, { Types } from 'mongoose';
import {
  ECouponType,
  ICoupon,
} from '../../../../domain/coupon/interfaces/coupon.interface';

export interface IMCoupon extends ICoupon {
  _id: Types.ObjectId;
}

export const couponSchema = new mongoose.Schema<IMCoupon>(
  {
    id: { type: String, required: true, unique: true },
    storeId: { type: String, required: true },
    code: { type: String, required: true, uppercase: true },
    type: { type: String, enum: Object.values(ECouponType), required: true },
    value: { type: Number, required: true },
    maxDiscountInCents: { type: Number },
    minOrderInCents: { type: Number, required: true },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    usageLimit: { type: Number },
    usagePerCustomer: { type: Number, required: true },
    usedCount: { type: Number, required: true, default: 0 },
    firstOrderOnly: { type: Boolean, required: true },
    isActive: { type: Boolean, required: true },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

couponSchema.index({ storeId: 1, code: 1 }, { unique: true });
