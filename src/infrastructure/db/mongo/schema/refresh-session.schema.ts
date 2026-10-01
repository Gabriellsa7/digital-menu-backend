import mongoose, { Types } from 'mongoose';
import { ESubjectType } from '../../../../domain/auth/interfaces/auth-subject.interface';
import { IRefreshSession } from '../../../../domain/auth/interfaces/refresh-session.interface';

export interface IMRefreshSession extends IRefreshSession {
  _id: Types.ObjectId;
}

export const refreshSessionSchema = new mongoose.Schema<IMRefreshSession>(
  {
    id: { type: String, required: true, unique: true },
    subjectId: { type: String, required: true },
    subjectType: {
      type: String,
      enum: Object.values(ESubjectType),
      required: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    familyId: { type: String, required: true, index: true },
    expiresAt: { type: Date, required: true },
    revokedAt: { type: Date },
    replacedById: { type: String },
    userAgent: { type: String },
  },
  { timestamps: true },
);

refreshSessionSchema.index({ subjectId: 1, subjectType: 1 });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
