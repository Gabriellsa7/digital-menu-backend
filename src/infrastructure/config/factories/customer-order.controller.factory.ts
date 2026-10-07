import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { CustomerOrderController } from '../../../interfaces/http/controllers/customer-order.controller';
import { OrderServiceFactory } from './order.service.factory';
import { PaymentServiceFactory } from './payment.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class CustomerOrderControllerFactory {
  static create(): IController {
    return new CustomerOrderController({
      orderService: OrderServiceFactory.create(),
      paymentService: PaymentServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
