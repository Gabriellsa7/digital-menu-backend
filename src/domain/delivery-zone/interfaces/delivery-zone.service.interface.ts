import { IClock } from '../../common/clock.interface';
import { IDeliveryZoneResolver } from '../../customer/interfaces/delivery-zone.resolver.interface';
import { IDeliveryZoneRepositoryRead } from '../repository/delivery-zone.repository.read';
import { IDeliveryZoneRepositoryWrite } from '../repository/delivery-zone.repository.write';
import { IDeliveryZone } from './delivery-zone.interface';

export interface IParamsDeliveryZoneData {
  displayName: string;
  city: string;
  feeInCents: number;
  etaMinMinutes: number;
  etaMaxMinutes: number;
  isActive: boolean;
}

export interface IParamsUpdateDeliveryZone
  extends Partial<IParamsDeliveryZoneData> {
  id: string;
}

export interface IParamsDeliveryZoneService {
  deliveryZoneRepositoryRead: IDeliveryZoneRepositoryRead;
  deliveryZoneRepositoryWrite: IDeliveryZoneRepositoryWrite;
  clock: IClock;
}

export interface IDeliveryZoneService extends IDeliveryZoneResolver {
  listDeliveryZones(activeOnly: boolean): Promise<IDeliveryZone[]>;
  getDeliveryZoneById(id: string): Promise<IDeliveryZone>;
  createDeliveryZone(params: IParamsDeliveryZoneData): Promise<IDeliveryZone>;
  updateDeliveryZone(params: IParamsUpdateDeliveryZone): Promise<IDeliveryZone>;
  deleteDeliveryZone(id: string): Promise<void>;
  resolveDeliveryZone(
    neighborhood: string,
    city: string,
  ): Promise<IDeliveryZone>;
}
