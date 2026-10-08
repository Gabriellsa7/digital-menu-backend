import { StoreHomeService } from '../../../domain/menu/service/store-home.service';
import { CachedBestSellersReader } from '../../cache/cached-best-sellers.reader';
import { SystemClock } from '../../common/system.clock';
import { OrderRepositoryRead } from '../../repository/order/order.repository.read';
import { CategoryServiceFactory } from './category.service.factory';
import { CouponServiceFactory } from './coupon.service.factory';
import { OptionGroupServiceFactory } from './option-group.service.factory';
import { ProductServiceFactory } from './product.service.factory';
import { StoreServiceFactory } from './store.service.factory';

const clock = new SystemClock();
const bestSellersReader = new CachedBestSellersReader(
  new OrderRepositoryRead(),
  clock,
);

export class StoreHomeServiceFactory {
  static create() {
    return new StoreHomeService({
      storeService: StoreServiceFactory.create(),
      categoryService: CategoryServiceFactory.create(),
      productService: ProductServiceFactory.create(),
      optionGroupService: OptionGroupServiceFactory.create(),
      couponService: CouponServiceFactory.create(),
      bestSellersReader,
      clock,
    });
  }
}
