import mongoose from 'mongoose';
import { IMCounter, counterSchema } from '../schema/counter.schema';

export const Mcounter = mongoose.model<IMCounter>('counter', counterSchema);
