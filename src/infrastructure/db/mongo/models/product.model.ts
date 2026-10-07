import mongoose from 'mongoose';
import { IMProduct, productSchema } from '../schema/product.schema';

export const Mproduct = mongoose.model<IMProduct>('product', productSchema);
