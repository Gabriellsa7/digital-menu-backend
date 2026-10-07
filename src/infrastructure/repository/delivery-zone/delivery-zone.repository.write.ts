import { IDeliveryZone } from '../../../domain/delivery-zone/interfaces/delivery-zone.interface';
import {
  IDeliveryZoneRepositoryWrite,
  TDeliveryZoneUpdatableFields,
} from '../../../domain/delivery-zone/repository/delivery-zone.repository.write';
import { MdeliveryZone } from '../../db/mongo/models/delivery-zone.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class DeliveryZoneRepositoryWrite
  implements IDeliveryZoneRepositoryWrite
{
  async createDeliveryZone(
    deliveryZone: IDeliveryZone,
  ): Promise<IDeliveryZone> {
    const created = await MdeliveryZone.create({ ...deliveryZone });
    const { _id, __v, ...createdDeliveryZone } = created.toObject();
    return createdDeliveryZone;
  }

  async updateDeliveryZoneById(
    id: string,
    fields: TDeliveryZoneUpdatableFields,
  ): Promise<IDeliveryZone | null> {
    return MdeliveryZone.findOneAndUpdate(
      { id },
      { $set: fields },
      { new: true, projection: HIDE_MONGO_INTERNAL_FIELDS },
    ).lean<IDeliveryZone>();
  }

  async deleteDeliveryZoneById(id: string): Promise<boolean> {
    const { deletedCount } = await MdeliveryZone.deleteOne({ id });
    return deletedCount === 1;
  }
}
