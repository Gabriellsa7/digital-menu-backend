import { IController } from '../../../interfaces/http/controllers/controller.interface';
import { ProductController } from '../../../interfaces/http/controllers/product.controller';
import { ProductServiceFactory } from './product.service.factory';
import { TokenServiceFactory } from './token.service.factory';

export class ProductControllerFactory {
  static create(): IController {
    return new ProductController({
      productService: ProductServiceFactory.create(),
      tokenService: TokenServiceFactory.create(),
    });
  }
}
