import mongoose, { Types } from 'mongoose';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../mongo.projection';
import {
  EManualStatus,
  IOpeningHour,
  IStore,
} from '../../../../domain/store/interfaces/store.interface';
import { IPostalAddress } from '../../../../domain/common/postal-address.interface';

export interface IMStore extends IStore {
  _id: Types.ObjectId;
  singleton: true;
}

export const STORE_SINGLETON_FILTER = { singleton: true } as const;

export const HIDE_STORE_INTERNAL_FIELDS = {
  ...HIDE_MONGO_INTERNAL_FIELDS,
  singleton: 0,
} as const;

const storeAddressSchema = new mongoose.Schema<IPostalAddress>(
  {
    zipCode: { type: String, default: '' },
    street: { type: String, default: '' },
    number: { type: String, default: '' },
    complement: { type: String },
    neighborhood: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    reference: { type: String },
  },
  { _id: false },
);

const openingHourSchema = new mongoose.Schema<IOpeningHour>(
  {
    weekday: { type: Number, min: 0, max: 6, required: true },
    opensAt: { type: String, required: true },
    closesAt: { type: String, required: true },
  },
  { _id: false },
);

export const storeSchema = new mongoose.Schema<IMStore>(
  {
    singleton: { type: Boolean, default: true, unique: true },
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: { type: String, default: '' },
    phone: { type: String, default: '' },
    logoUrl: { type: String },
    logoPublicId: { type: String },
    bannerUrl: { type: String },
    bannerPublicId: { type: String },
    address: { type: storeAddressSchema, required: true },
    timezone: { type: String, required: true },
    openingHours: { type: [openingHourSchema], default: [] },
    manualStatus: {
      type: String,
      enum: Object.values(EManualStatus),
      required: true,
    },
    manualStatusUntil: { type: Date },
    minimumOrderInCents: { type: Number, required: true },
    deliveryEnabled: { type: Boolean, required: true },
    pickupEnabled: { type: Boolean, required: true },
    pickupEtaMinutes: { type: Number, required: true },
    isPublished: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
