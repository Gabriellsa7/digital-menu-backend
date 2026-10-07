import mongoose from 'mongoose';
import { IMStore, storeSchema } from '../schema/store.schema';

export const Mstore = mongoose.model<IMStore>('store', storeSchema);
