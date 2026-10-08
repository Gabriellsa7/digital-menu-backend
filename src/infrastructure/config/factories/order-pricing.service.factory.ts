import { OrderPricingService } from '../../../domain/order/service/order-pricing.service';
import { CouponServiceFactory } from './coupon.service.factory';
import { CustomerServiceFactory } from './customer.service.factory';
import { DeliveryZoneServiceFactory } from './delivery-zone.service.factory';
import { OptionGroupServiceFactory } from './option-group.service.factory';
import { ProductServiceFactory } from './product.service.factory';
import { StoreServiceFactory } from './store.service.factory';

export class OrderPricingServiceFactory {
  static create() {
    return new OrderPricingService({
      storeService: StoreServiceFactory.create(),
      customerService: CustomerServiceFactory.create(),
      deliveryZoneService: DeliveryZoneServiceFactory.create(),
      productService: ProductServiceFactory.create(),
      optionGroupService: OptionGroupServiceFactory.create(),
      couponService: CouponServiceFactory.create(),
    });
  }
}
