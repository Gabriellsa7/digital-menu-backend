import { IStoreStatus } from '../interfaces/store.interface';

export interface IParamsOptionAvailabilityChanged {
  storeId: string;
  optionGroupId: string;
  optionId: string;
  isAvailable: boolean;
}

export interface IStoreEventPublisher {
  publishStoreStatusChanged(storeId: string, status: IStoreStatus): void;
  publishProductAvailabilityChanged(
    storeId: string,
    productId: string,
    isAvailable: boolean,
  ): void;
  publishOptionAvailabilityChanged(
    params: IParamsOptionAvailabilityChanged,
  ): void;
}
