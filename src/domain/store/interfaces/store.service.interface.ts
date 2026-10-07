import { IClock } from '../../common/clock.interface';
import { IPostalAddress } from '../../common/postal-address.interface';
import { IStoreRepositoryRead } from '../repository/store.repository.read';
import { IStoreRepositoryWrite } from '../repository/store.repository.write';
import {
  EManualStatus,
  IOpeningHour,
  IStore,
  IStoreStatus,
} from './store.interface';

export interface IParamsUpdateStore {
  name?: string;
  slug?: string;
  description?: string;
  phone?: string;
  address?: IPostalAddress;
  timezone?: string;
  minimumOrderInCents?: number;
  deliveryEnabled?: boolean;
  pickupEnabled?: boolean;
  pickupEtaMinutes?: number;
}

export interface IStoreWithStatus {
  store: IStore;
  status: IStoreStatus;
}

export interface IParamsStoreService {
  storeRepositoryRead: IStoreRepositoryRead;
  storeRepositoryWrite: IStoreRepositoryWrite;
  clock: IClock;
}

export interface IStoreService {
  getStore(): Promise<IStore>;
  getStoreWithStatus(): Promise<IStoreWithStatus>;
  updateStore(params: IParamsUpdateStore): Promise<IStore>;
  setOpeningHours(openingHours: IOpeningHour[]): Promise<IStore>;
  setManualStatus(manualStatus: EManualStatus): Promise<IStoreWithStatus>;
  assertAcceptingOrders(): Promise<IStore>;
}
