import mongoose from 'mongoose';
import { IMStaffUser, staffUserSchema } from '../schema/staff-user.schema';

export const MstaffUser = mongoose.model<IMStaffUser>(
  'staffUser',
  staffUserSchema,
);
