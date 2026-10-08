import { IClock } from '../../common/clock.interface';
import { ICategoryService } from '../../category/interfaces/category.service.interface';
import { ICouponService } from '../../coupon/interfaces/coupon.service.interface';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import { IProductService } from '../../product/interfaces/product.service.interface';
import { IStoreService } from '../../store/interfaces/store.service.interface';
import { IBestSellersReader } from './best-sellers.reader.interface';
import { IStoreHome } from './store-home.interface';

export interface IParamsStoreHomeService {
  storeService: IStoreService;
  categoryService: ICategoryService;
  productService: IProductService;
  optionGroupService: IOptionGroupService;
  couponService: ICouponService;
  bestSellersReader: IBestSellersReader;
  clock: IClock;
}

export interface IStoreHomeService {
  getStoreHome(storeSlug: string): Promise<IStoreHome>;
}
