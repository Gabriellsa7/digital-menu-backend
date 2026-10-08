import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { StaffAuthController } from '../../../interfaces/http/controllers/staff-auth.controller';
import { env } from '../env';
import { StaffAuthServiceFactory } from './staff-auth.service.factory';

export class StaffAuthControllerFactory {
  static create(): IController {
    return new StaffAuthController({
      staffAuthService: StaffAuthServiceFactory.create(),
      cookieSettings: { secure: env.isProduction, domain: env.cookieDomain },
      authRateLimitMax: env.authRateLimitMax,
    });
  }
}
