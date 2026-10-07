import { ICategoryService } from '../../category/interfaces/category.service.interface';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import { IProductService } from '../../product/interfaces/product.service.interface';
import { IMenu, IMenuProduct } from './menu.interface';

export interface IParamsMenuService {
  categoryService: ICategoryService;
  productService: IProductService;
  optionGroupService: IOptionGroupService;
}

export interface IMenuService {
  getMenu(): Promise<IMenu>;
  getMenuProduct(productId: string): Promise<IMenuProduct>;
}
