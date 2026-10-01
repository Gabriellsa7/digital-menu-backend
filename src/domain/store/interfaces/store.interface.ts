import { IPostalAddress } from '../../common/postal-address.interface';

export enum EManualStatus {
  AUTO = 'AUTO',
  FORCED_OPEN = 'FORCED_OPEN',
  FORCED_CLOSED = 'FORCED_CLOSED',
}

export enum EWeekday {
  SUNDAY = 0,
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
}

export interface IOpeningHour {
  weekday: EWeekday;
  opensAt: string;
  closesAt: string;
}

export interface IStore {
  id: string;
  name: string;
  slug: string;
  description: string;
  phone: string;
  logoUrl?: string;
  logoPublicId?: string;
  bannerUrl?: string;
  bannerPublicId?: string;
  address: IPostalAddress;
  timezone: string;
  openingHours: IOpeningHour[];
  manualStatus: EManualStatus;
  minimumOrderInCents: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  pickupEtaMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStoreStatus {
  isOpenNow: boolean;
  manualStatus: EManualStatus;
  closesAt?: Date;
  nextOpeningAt?: Date;
}
