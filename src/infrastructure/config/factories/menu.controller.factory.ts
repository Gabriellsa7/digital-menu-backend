import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { MenuController } from '../../../interfaces/http/controllers/menu.controller';
import { MenuServiceFactory } from './menu.service.factory';
import { StoreHomeServiceFactory } from './store-home.service.factory';

export class MenuControllerFactory {
  static create(): IController {
    return new MenuController({
      menuService: MenuServiceFactory.create(),
      storeHomeService: StoreHomeServiceFactory.create(),
    });
  }
}
