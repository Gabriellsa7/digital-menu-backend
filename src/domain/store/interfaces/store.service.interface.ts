import { IClock } from '../../common/clock.interface';
import { IPostalAddress } from '../../common/postal-address.interface';
import {
  IImageFile,
  IStorageProvider,
} from '../../common/storage.provider.interface';
import { IStoreEventPublisher } from '../events/store.event.publisher';
import { IStoreRepositoryRead } from '../repository/store.repository.read';
import { IStoreRepositoryWrite } from '../repository/store.repository.write';
import {
  EManualStatus,
  IOpeningHour,
  IStore,
  IStoreStatus,
} from './store.interface';

export enum EStoreImageKind {
  LOGO = 'logo',
  BANNER = 'banner',
}

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
  storageProvider: IStorageProvider;
  storeEventPublisher: IStoreEventPublisher;
  clock: IClock;
}

export interface IStoreService {
  getStore(): Promise<IStore>;
  getStoreWithStatus(): Promise<IStoreWithStatus>;
  updateStore(params: IParamsUpdateStore): Promise<IStore>;
  setOpeningHours(openingHours: IOpeningHour[]): Promise<IStore>;
  setManualStatus(manualStatus: EManualStatus): Promise<IStoreWithStatus>;
  assertAcceptingOrders(): Promise<IStore>;
  refreshStoreStatus(): Promise<IStoreStatus>;
  setStoreImage(kind: EStoreImageKind, file?: IImageFile): Promise<IStore>;
}
