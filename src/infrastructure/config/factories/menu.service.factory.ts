import { MenuService } from '../../../domain/menu/service/menu.service';
import { CategoryServiceFactory } from './category.service.factory';
import { OptionGroupServiceFactory } from './option-group.service.factory';
import { ProductServiceFactory } from './product.service.factory';
import { SystemClock } from '../../common/system.clock';
import { StoreServiceFactory } from './store.service.factory';

export class MenuServiceFactory {
  static create() {
    return new MenuService({
      storeService: StoreServiceFactory.create(),
      categoryService: CategoryServiceFactory.create(),
      productService: ProductServiceFactory.create(),
      optionGroupService: OptionGroupServiceFactory.create(),
      clock: new SystemClock(),
    });
  }
}
