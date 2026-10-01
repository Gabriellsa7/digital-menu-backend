import mongoose from 'mongoose';
import {
  IMRefreshSession,
  refreshSessionSchema,
} from '../schema/refresh-session.schema';

export const MrefreshSession = mongoose.model<IMRefreshSession>(
  'refreshSession',
  refreshSessionSchema,
);
