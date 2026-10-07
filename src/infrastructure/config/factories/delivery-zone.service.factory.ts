import { DeliveryZoneService } from '../../../domain/delivery-zone/service/delivery-zone.service';
import { SystemClock } from '../../common/system.clock';
import { DeliveryZoneRepositoryRead } from '../../repository/delivery-zone/delivery-zone.repository.read';
import { DeliveryZoneRepositoryWrite } from '../../repository/delivery-zone/delivery-zone.repository.write';

export class DeliveryZoneServiceFactory {
  static create() {
    return new DeliveryZoneService({
      deliveryZoneRepositoryRead: new DeliveryZoneRepositoryRead(),
      deliveryZoneRepositoryWrite: new DeliveryZoneRepositoryWrite(),
      clock: new SystemClock(),
    });
  }
}
