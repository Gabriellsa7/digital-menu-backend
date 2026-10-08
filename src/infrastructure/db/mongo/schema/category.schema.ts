import mongoose, { Types } from 'mongoose';
import { ICategory } from '../../../../domain/category/interfaces/category.interface';

export interface IMCategory extends ICategory {
  _id: Types.ObjectId;
}

export const CASE_INSENSITIVE_COLLATION = { locale: 'pt', strength: 2 };

export const categorySchema = new mongoose.Schema<IMCategory>(
  {
    id: { type: String, required: true, unique: true },
    storeId: { type: String, required: true },
    name: { type: String, required: true },
    position: { type: Number, required: true },
    isActive: { type: Boolean, required: true },
  },
  { timestamps: true },
);

categorySchema.index(
  { storeId: 1, name: 1 },
  { unique: true, collation: CASE_INSENSITIVE_COLLATION },
);
categorySchema.index({ storeId: 1, position: 1 });
