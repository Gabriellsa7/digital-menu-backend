import { IClock } from '../../common/clock.interface';
import { IDeliveryZoneResolver } from '../../customer/interfaces/delivery-zone.resolver.interface';
import { IDeliveryZoneRepositoryRead } from '../repository/delivery-zone.repository.read';
import { IDeliveryZoneRepositoryWrite } from '../repository/delivery-zone.repository.write';
import { IDeliveryZone } from './delivery-zone.interface';

export interface IParamsDeliveryZoneData {
  storeId: string;
  displayName: string;
  city: string;
  feeInCents: number;
  etaMinMinutes: number;
  etaMaxMinutes: number;
  isActive: boolean;
}

export interface IParamsUpdateDeliveryZone
  extends Partial<Omit<IParamsDeliveryZoneData, 'storeId'>> {
  storeId: string;
  id: string;
}

export interface IParamsDeliveryZoneService {
  deliveryZoneRepositoryRead: IDeliveryZoneRepositoryRead;
  deliveryZoneRepositoryWrite: IDeliveryZoneRepositoryWrite;
  clock: IClock;
}

export interface IDeliveryZoneService extends IDeliveryZoneResolver {
  listDeliveryZones(
    storeId: string,
    activeOnly: boolean,
  ): Promise<IDeliveryZone[]>;
  getDeliveryZoneById(storeId: string, id: string): Promise<IDeliveryZone>;
  createDeliveryZone(params: IParamsDeliveryZoneData): Promise<IDeliveryZone>;
  updateDeliveryZone(params: IParamsUpdateDeliveryZone): Promise<IDeliveryZone>;
  deleteDeliveryZone(storeId: string, id: string): Promise<void>;
  resolveDeliveryZone(
    storeId: string,
    neighborhood: string,
    city: string,
  ): Promise<IDeliveryZone>;
}
