import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { StaffUserController } from '../../../interfaces/http/controllers/staff-user.controller';
import { StaffUserServiceFactory } from './staff-user.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class StaffUserControllerFactory {
  static create(): IController {
    return new StaffUserController({
      staffUserService: StaffUserServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
