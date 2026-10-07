import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { OptionGroupController } from '../../../interfaces/http/controllers/option-group.controller';
import { OptionGroupServiceFactory } from './option-group.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class OptionGroupControllerFactory {
  static create(): IController {
    return new OptionGroupController({
      optionGroupService: OptionGroupServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
