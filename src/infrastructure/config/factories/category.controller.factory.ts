import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { CategoryController } from '../../../interfaces/http/controllers/category.controller';
import { CategoryServiceFactory } from './category.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class CategoryControllerFactory {
  static create(): IController {
    return new CategoryController({
      categoryService: CategoryServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
