import mongoose from 'mongoose';
import { IMCustomer, customerSchema } from '../schema/customer.schema';

export const Mcustomer = mongoose.model<IMCustomer>('customer', customerSchema);
