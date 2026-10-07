import { IDeliveryZone } from '../../../domain/delivery-zone/interfaces/delivery-zone.interface';
import {
  IDeliveryZoneRepositoryRead,
  IParamsListDeliveryZones,
} from '../../../domain/delivery-zone/repository/delivery-zone.repository.read';
import { MdeliveryZone } from '../../db/mongo/models/delivery-zone.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class DeliveryZoneRepositoryRead implements IDeliveryZoneRepositoryRead {
  async findDeliveryZoneById(id: string): Promise<IDeliveryZone | null> {
    return MdeliveryZone.findOne(
      { id },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IDeliveryZone>();
  }

  async findDeliveryZoneByKeys(
    neighborhood: string,
    cityKey: string,
  ): Promise<IDeliveryZone | null> {
    return MdeliveryZone.findOne(
      { neighborhood, cityKey },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IDeliveryZone>();
  }

  async listDeliveryZones({
    isActive,
  }: IParamsListDeliveryZones): Promise<IDeliveryZone[]> {
    return MdeliveryZone.find(
      isActive === undefined ? {} : { isActive },
      HIDE_MONGO_INTERNAL_FIELDS,
    )
      .sort({ cityKey: 1, neighborhood: 1 })
      .lean<IDeliveryZone[]>();
  }
}
