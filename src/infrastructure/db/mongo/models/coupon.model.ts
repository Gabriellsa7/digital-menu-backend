import mongoose from 'mongoose';
import { IMCoupon, couponSchema } from '../schema/coupon.schema';

export const Mcoupon = mongoose.model<IMCoupon>('coupon', couponSchema);
