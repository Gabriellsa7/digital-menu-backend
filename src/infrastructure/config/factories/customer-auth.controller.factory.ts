import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { CustomerAuthController } from '../../../interfaces/http/controllers/customer-auth.controller';
import { env } from '../env';
import {
  CustomerAuthServiceFactory,
  IParamsCustomerAuthAdapters,
} from './customer-auth.service.factory';

export class CustomerAuthControllerFactory {
  static create(adapters: IParamsCustomerAuthAdapters = {}): IController {
    return new CustomerAuthController({
      customerAuthService: CustomerAuthServiceFactory.create(adapters),
      cookieSettings: { secure: env.isProduction, domain: env.cookieDomain },
    });
  }
}
