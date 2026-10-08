import mongoose from 'mongoose';
import { IMCategory, categorySchema } from '../schema/category.schema';

export const Mcategory = mongoose.model<IMCategory>('category', categorySchema);
