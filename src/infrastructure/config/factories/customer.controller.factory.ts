import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { CustomerController } from '../../../interfaces/http/controllers/customer.controller';
import {
  CustomerAuthServiceFactory,
  IParamsCustomerAuthAdapters,
} from './customer-auth.service.factory';
import { CustomerServiceFactory } from './customer.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class CustomerControllerFactory {
  static create(adapters: IParamsCustomerAuthAdapters = {}): IController {
    return new CustomerController({
      customerService: CustomerServiceFactory.create(),
      customerAuthService: CustomerAuthServiceFactory.create(adapters),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
