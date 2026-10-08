import { IClock } from '../../common/clock.interface';
import { IPostalAddress } from '../../common/postal-address.interface';
import {
  IImageFile,
  IStorageProvider,
} from '../../common/storage.provider.interface';
import { IStoreEventPublisher } from '../events/store.event.publisher';
import { IPaginatedResult } from '../../common/pagination.interface';
import {
  IParamsListPublishedStores,
  IStoreRepositoryRead,
} from '../repository/store.repository.read';
import { IStoreRepositoryWrite } from '../repository/store.repository.write';
import { IStoreReadiness } from './store-readiness.interface';
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

export interface IParamsCreateStore extends IParamsUpdateStore {
  name: string;
  isPublished?: boolean;
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
  storeReadiness: IStoreReadiness;
  clock: IClock;
}

export interface IStoreService {
  createStore(params: IParamsCreateStore): Promise<IStore>;
  ensureDefaultStore(): Promise<IStore>;
  getStore(storeId: string): Promise<IStore>;
  getStoreWithStatus(storeId: string): Promise<IStoreWithStatus>;
  getPublishedStoreBySlug(slug: string): Promise<IStoreWithStatus>;
  listActiveStores(): Promise<IStore[]>;
  listPublishedStores(
    params: IParamsListPublishedStores,
  ): Promise<IPaginatedResult<IStoreWithStatus>>;
  deleteStore(storeId: string): Promise<void>;
  setPublished(
    storeId: string,
    isPublished: boolean,
  ): Promise<IStoreWithStatus>;
  updateStore(storeId: string, params: IParamsUpdateStore): Promise<IStore>;
  setOpeningHours(
    storeId: string,
    openingHours: IOpeningHour[],
  ): Promise<IStore>;
  setManualStatus(
    storeId: string,
    manualStatus: EManualStatus,
  ): Promise<IStoreWithStatus>;
  assertAcceptingOrders(storeId: string): Promise<IStore>;
  refreshStoreStatus(storeId: string): Promise<IStoreStatus>;
  setStoreImage(
    storeId: string,
    kind: EStoreImageKind,
    file?: IImageFile,
  ): Promise<IStore>;
}
