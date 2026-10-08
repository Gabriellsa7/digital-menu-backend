import mongoose, { Types } from 'mongoose';
import { IProduct } from '../../../../domain/product/interfaces/product.interface';

export interface IMProduct extends IProduct {
  _id: Types.ObjectId;
}

export const productSchema = new mongoose.Schema<IMProduct>(
  {
    id: { type: String, required: true, unique: true },
    storeId: { type: String, required: true },
    categoryId: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    priceInCents: { type: Number, required: true, min: 0 },
    imageUrl: { type: String },
    imagePublicId: { type: String },
    optionGroupIds: { type: [String], default: [] },
    isAvailable: { type: Boolean, required: true },
    isActive: { type: Boolean, required: true },
    position: { type: Number, required: true },
    servesPeople: { type: Number },
  },
  { timestamps: true },
);

productSchema.index({ storeId: 1, categoryId: 1, position: 1 });
productSchema.index({ optionGroupIds: 1 });
