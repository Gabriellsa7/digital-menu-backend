import mongoose, { Types } from 'mongoose';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../mongo.projection';
import {
  EStaffRole,
  IStaffUserWithPassword,
} from '../../../../domain/staff-user/interfaces/staff-user.interface';

export interface IMStaffUser extends IStaffUserWithPassword {
  _id: Types.ObjectId;
}

export const HIDE_STAFF_USER_PRIVATE_FIELDS = {
  ...HIDE_MONGO_INTERNAL_FIELDS,
  passwordHash: 0,
} as const;

export const staffUserSchema = new mongoose.Schema<IMStaffUser>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(EStaffRole), required: true },
    isActive: { type: Boolean, required: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);
