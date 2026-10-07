import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { AdminOrderController } from '../../../interfaces/http/controllers/admin-order.controller';
import { OrderServiceFactory } from './order.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class AdminOrderControllerFactory {
  static create(): IController {
    return new AdminOrderController({
      orderService: OrderServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
