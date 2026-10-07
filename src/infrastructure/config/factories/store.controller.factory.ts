import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { StoreController } from '../../../interfaces/http/controllers/store.controller';
import { StoreServiceFactory } from './store.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class StoreControllerFactory {
  static create(): IController {
    return new StoreController({
      storeService: StoreServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
