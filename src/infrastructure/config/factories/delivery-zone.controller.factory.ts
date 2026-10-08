import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { DeliveryZoneController } from '../../../interfaces/http/controllers/delivery-zone.controller';
import { DeliveryZoneServiceFactory } from './delivery-zone.service.factory';
import { StoreServiceFactory } from './store.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class DeliveryZoneControllerFactory {
  static create(): IController {
    return new DeliveryZoneController({
      deliveryZoneService: DeliveryZoneServiceFactory.create(),
      storeService: StoreServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
