import { IPostalAddress } from '../../../domain/common/postal-address.interface';
import {
  IOpeningHour,
  IStoreStatus,
} from '../../../domain/store/interfaces/store.interface';
import { IStoreWithStatus } from '../../../domain/store/interfaces/store.service.interface';

export interface IStoreResponse {
  id: string;
  name: string;
  slug: string;
  description: string;
  phone: string;
  logoUrl?: string;
  bannerUrl?: string;
  address: IPostalAddress;
  timezone: string;
  openingHours: IOpeningHour[];
  minimumOrderInCents: number;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  pickupEtaMinutes: number;
  isPublished: boolean;
  status: IStoreStatus;
}

export function toStoreResponse({
  store,
  status,
}: IStoreWithStatus): IStoreResponse {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    description: store.description,
    phone: store.phone,
    ...(store.logoUrl && { logoUrl: store.logoUrl }),
    ...(store.bannerUrl && { bannerUrl: store.bannerUrl }),
    address: store.address,
    timezone: store.timezone,
    openingHours: store.openingHours.map(({ weekday, opensAt, closesAt }) => ({
      weekday,
      opensAt,
      closesAt,
    })),
    minimumOrderInCents: store.minimumOrderInCents,
    deliveryEnabled: store.deliveryEnabled,
    pickupEnabled: store.pickupEnabled,
    pickupEtaMinutes: store.pickupEtaMinutes,
    isPublished: store.isPublished,
    status,
  };
}
