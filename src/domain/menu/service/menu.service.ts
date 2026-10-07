import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { ICategoryService } from '../../category/interfaces/category.service.interface';
import { NotFoundError } from '../../errors/not-found.error';
import { IOptionGroup } from '../../option-group/interfaces/option-group.interface';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import { IProduct } from '../../product/interfaces/product.interface';
import { IProductService } from '../../product/interfaces/product.service.interface';
import { IMenu, IMenuProduct } from '../interfaces/menu.interface';
import {
  IMenuService,
  IParamsMenuService,
} from '../interfaces/menu.service.interface';
import { toMenuProduct } from '../menu-product.factory';

export class MenuService implements IMenuService {
  private categoryService: ICategoryService;
  private productService: IProductService;
  private optionGroupService: IOptionGroupService;

  constructor({
    categoryService,
    productService,
    optionGroupService,
  }: IParamsMenuService) {
    this.categoryService = categoryService;
    this.productService = productService;
    this.optionGroupService = optionGroupService;
  }

  @ErrorHandler()
  async getMenu(): Promise<IMenu> {
    const [categories, products] = await Promise.all([
      this.categoryService.listCategories(),
      this.productService.listActiveProducts(),
    ]);
    const optionGroupsById = await this.optionGroupsFor(products);

    return {
      categories: categories
        .filter(({ isActive }) => isActive)
        .map((category) => ({
          id: category.id,
          name: category.name,
          products: products
            .filter(({ categoryId }) => categoryId === category.id)
            .map((product) => toMenuProduct(product, optionGroupsById)),
        }))
        .filter(({ products: categoryProducts }) => categoryProducts.length > 0),
    };
  }

  @ErrorHandler()
  async getMenuProduct(productId: string): Promise<IMenuProduct> {
    const product = await this.productService.getProductById(productId);
    const category = await this.categoryService.getCategoryById(
      product.categoryId,
    );
    if (!product.isActive || !category.isActive) {
      throw new NotFoundError('Product not found');
    }

    return toMenuProduct(product, await this.optionGroupsFor([product]));
  }

  private async optionGroupsFor(
    products: IProduct[],
  ): Promise<Map<string, IOptionGroup>> {
    const ids = [...new Set(products.flatMap((p) => p.optionGroupIds))];
    const optionGroups =
      await this.optionGroupService.findOptionGroupsByIds(ids);
    return new Map(optionGroups.map((group) => [group.id, group]));
  }
}
