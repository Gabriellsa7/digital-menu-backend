import mongoose, { Types } from 'mongoose';
import { IDeliveryZone } from '../../../../domain/delivery-zone/interfaces/delivery-zone.interface';

export interface IMDeliveryZone extends IDeliveryZone {
  _id: Types.ObjectId;
}

export const deliveryZoneSchema = new mongoose.Schema<IMDeliveryZone>(
  {
    id: { type: String, required: true, unique: true },
    neighborhood: { type: String, required: true },
    displayName: { type: String, required: true },
    city: { type: String, required: true },
    cityKey: { type: String, required: true },
    feeInCents: { type: Number, required: true, min: 0 },
    etaMinMinutes: { type: Number, required: true },
    etaMaxMinutes: { type: Number, required: true },
    isActive: { type: Boolean, required: true },
  },
  { timestamps: true },
);

deliveryZoneSchema.index({ neighborhood: 1, cityKey: 1 }, { unique: true });
