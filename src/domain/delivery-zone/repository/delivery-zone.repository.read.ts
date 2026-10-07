import { IDeliveryZone } from '../interfaces/delivery-zone.interface';

export interface IParamsListDeliveryZones {
  isActive?: boolean;
}

export interface IDeliveryZoneRepositoryRead {
  findDeliveryZoneById(id: string): Promise<IDeliveryZone | null>;
  findDeliveryZoneByKeys(
    neighborhood: string,
    cityKey: string,
  ): Promise<IDeliveryZone | null>;
  listDeliveryZones(params: IParamsListDeliveryZones): Promise<IDeliveryZone[]>;
}
