import mongoose, { Types } from 'mongoose';
import { IOtp } from '../../../../domain/otp/interfaces/otp.interface';

export interface IMOtp extends IOtp {
  _id: Types.ObjectId;
}

const OTP_RETENTION_SECONDS = 60 * 60;

export const otpSchema = new mongoose.Schema<IMOtp>(
  {
    id: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, required: true, default: 0 },
    consumedAt: { type: Date },
  },
  { timestamps: true },
);

otpSchema.index({ phone: 1, createdAt: -1 });
otpSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: OTP_RETENTION_SECONDS },
);
