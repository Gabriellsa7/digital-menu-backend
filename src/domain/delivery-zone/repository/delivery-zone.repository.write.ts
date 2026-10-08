import { IDeliveryZone } from '../interfaces/delivery-zone.interface';

export type TDeliveryZoneUpdatableFields = Partial<
  Omit<IDeliveryZone, 'id' | 'createdAt' | 'updatedAt'>
>;

export interface IDeliveryZoneRepositoryWrite {
  createDeliveryZone(deliveryZone: IDeliveryZone): Promise<IDeliveryZone>;
  updateDeliveryZoneById(
    id: string,
    fields: TDeliveryZoneUpdatableFields,
  ): Promise<IDeliveryZone | null>;
  deleteDeliveryZoneById(id: string): Promise<boolean>;
}
