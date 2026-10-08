import { IDeliveryZone } from '../interfaces/delivery-zone.interface';

export interface IParamsListDeliveryZones {
  isActive?: boolean;
}

export interface IDeliveryZoneRepositoryRead {
  findDeliveryZoneById(id: string): Promise<IDeliveryZone | null>;
  findDeliveryZoneByKeys(
    storeId: string,
    neighborhood: string,
    cityKey: string,
  ): Promise<IDeliveryZone | null>;
  listDeliveryZones(
    storeId: string,
    params: IParamsListDeliveryZones,
  ): Promise<IDeliveryZone[]>;
}
