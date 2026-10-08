import { IStoreStatus } from '../interfaces/store.interface';

export interface IParamsOptionAvailabilityChanged {
  optionGroupId: string;
  optionId: string;
  isAvailable: boolean;
}

export interface IStoreEventPublisher {
  publishStoreStatusChanged(status: IStoreStatus): void;
  publishProductAvailabilityChanged(
    productId: string,
    isAvailable: boolean,
  ): void;
  publishOptionAvailabilityChanged(
    params: IParamsOptionAvailabilityChanged,
  ): void;
}
