import { IDeliveryZone } from '../../../domain/delivery-zone/interfaces/delivery-zone.interface';

export interface IPublicDeliveryZoneResponse {
  id: string;
  name: string;
  city: string;
  feeInCents: number;
  etaMinMinutes: number;
  etaMaxMinutes: number;
}

export interface IDeliveryZoneResponse extends IPublicDeliveryZoneResponse {
  isActive: boolean;
  createdAt: Date;
}

export function toPublicDeliveryZoneResponse(
  deliveryZone: IDeliveryZone,
): IPublicDeliveryZoneResponse {
  return {
    id: deliveryZone.id,
    name: deliveryZone.displayName,
    city: deliveryZone.city,
    feeInCents: deliveryZone.feeInCents,
    etaMinMinutes: deliveryZone.etaMinMinutes,
    etaMaxMinutes: deliveryZone.etaMaxMinutes,
  };
}

export function toDeliveryZoneResponse(
  deliveryZone: IDeliveryZone,
): IDeliveryZoneResponse {
  return {
    ...toPublicDeliveryZoneResponse(deliveryZone),
    isActive: deliveryZone.isActive,
    createdAt: deliveryZone.createdAt,
  };
}
