import mongoose from 'mongoose';
import { IMOrder, orderSchema } from '../schema/order.schema';

export const Morder = mongoose.model<IMOrder>('order', orderSchema);
