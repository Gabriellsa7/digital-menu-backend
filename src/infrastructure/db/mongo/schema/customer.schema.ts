import mongoose, { Types } from 'mongoose';
import {
  IAddress,
  ICustomer,
} from '../../../../domain/customer/interfaces/customer.interface';

/**
 * Persistence shape of the customer document: the domain interface plus the
 * Mongo-specific fields.
 */
export interface IMCustomer extends ICustomer {
  _id: Types.ObjectId;
}

// Optional fields have no `default: null`: a missing value must be absent
// from the document so the sparse/partial indexes below work.
const addressSchema = new mongoose.Schema<IAddress>(
  {
    id: { type: String, required: true },
    label: { type: String, required: true },
    zipCode: { type: String, required: true },
    street: { type: String, required: true },
    number: { type: String, required: true },
    complement: { type: String },
    neighborhood: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    reference: { type: String },
    deliveryZoneId: { type: String },
    isDefault: { type: Boolean, required: true },
  },
  { _id: false },
);

export const customerSchema = new mongoose.Schema<IMCustomer>(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String },
    phone: { type: String },
    phoneVerifiedAt: { type: Date },
    email: { type: String, lowercase: true },
    googleSub: { type: String },
    avatarUrl: { type: String },
    addresses: { type: [addressSchema], default: [] },
    lastLoginAt: { type: Date, required: true },
  },
  { timestamps: true },
);

customerSchema.index({ googleSub: 1 }, { unique: true, sparse: true });
// Only verified phones are login identities (CUS-R05)
customerSchema.index(
  { phone: 1 },
  {
    unique: true,
    partialFilterExpression: { phoneVerifiedAt: { $exists: true } },
  },
);
