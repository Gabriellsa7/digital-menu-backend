import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { DeliveryZoneController } from '../../../interfaces/http/controllers/delivery-zone.controller';
import { DeliveryZoneServiceFactory } from './delivery-zone.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class DeliveryZoneControllerFactory {
  static create(): IController {
    return new DeliveryZoneController({
      deliveryZoneService: DeliveryZoneServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
