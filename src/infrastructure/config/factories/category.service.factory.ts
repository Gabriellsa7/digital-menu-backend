import { CategoryService } from '../../../domain/category/service/category.service';
import { ProductUsage } from '../../repository/product/product.usage';
import { SystemClock } from '../../common/system.clock';
import { CategoryRepositoryRead } from '../../repository/category/category.repository.read';
import { CategoryRepositoryWrite } from '../../repository/category/category.repository.write';

export class CategoryServiceFactory {
  static create() {
    return new CategoryService({
      categoryRepositoryRead: new CategoryRepositoryRead(),
      categoryRepositoryWrite: new CategoryRepositoryWrite(),
      categoryUsage: new ProductUsage(),
      clock: new SystemClock(),
    });
  }
}
