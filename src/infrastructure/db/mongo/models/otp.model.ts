import mongoose from 'mongoose';
import { IMOtp, otpSchema } from '../schema/otp.schema';

export const Motp = mongoose.model<IMOtp>('otp', otpSchema);
