import mongoose from 'mongoose';
import {
  IMDeliveryZone,
  deliveryZoneSchema,
} from '../schema/delivery-zone.schema';

export const MdeliveryZone = mongoose.model<IMDeliveryZone>(
  'deliveryZone',
  deliveryZoneSchema,
);
