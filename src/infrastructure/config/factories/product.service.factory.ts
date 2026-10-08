import { ProductService } from '../../../domain/product/service/product.service';
import { SystemClock } from '../../common/system.clock';
import { ProductRepositoryRead } from '../../repository/product/product.repository.read';
import { ProductRepositoryWrite } from '../../repository/product/product.repository.write';
import { CategoryServiceFactory } from './category.service.factory';
import { OptionGroupServiceFactory } from './option-group.service.factory';
import { StorageProviderFactory } from './storage.provider.factory';
import { StoreEventPublisherFactory } from './store-event-publisher.factory';

export class ProductServiceFactory {
  static create() {
    return new ProductService({
      productRepositoryRead: new ProductRepositoryRead(),
      productRepositoryWrite: new ProductRepositoryWrite(),
      categoryService: CategoryServiceFactory.create(),
      optionGroupService: OptionGroupServiceFactory.create(),
      storageProvider: StorageProviderFactory.create(),
      storeEventPublisher: StoreEventPublisherFactory.create(),
      clock: new SystemClock(),
    });
  }
}
