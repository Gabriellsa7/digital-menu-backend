import { IStoreService } from '../../store/interfaces/store.service.interface';
import { ICategoryService } from '../../category/interfaces/category.service.interface';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import { IProductService } from '../../product/interfaces/product.service.interface';
import { IMenu, IMenuProduct } from './menu.interface';

export interface IParamsMenuService {
  storeService: IStoreService;
  categoryService: ICategoryService;
  productService: IProductService;
  optionGroupService: IOptionGroupService;
}

export interface IMenuService {
  getMenu(storeSlug: string): Promise<IMenu>;
  getMenuProduct(storeSlug: string, productId: string): Promise<IMenuProduct>;
}
