import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { ICategoryService } from '../../category/interfaces/category.service.interface';
import { IStoreService } from '../../store/interfaces/store.service.interface';
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
  private storeService: IStoreService;
  private categoryService: ICategoryService;
  private productService: IProductService;
  private optionGroupService: IOptionGroupService;

  constructor({
    storeService,
    categoryService,
    productService,
    optionGroupService,
  }: IParamsMenuService) {
    this.storeService = storeService;
    this.categoryService = categoryService;
    this.productService = productService;
    this.optionGroupService = optionGroupService;
  }

  @ErrorHandler()
  async getMenu(storeSlug: string): Promise<IMenu> {
    const storeId = await this.publishedStoreId(storeSlug);
    const [categories, products] = await Promise.all([
      this.categoryService.listCategories(storeId),
      this.productService.listActiveProducts(storeId),
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
  async getMenuProduct(
    storeSlug: string,
    productId: string,
  ): Promise<IMenuProduct> {
    const storeId = await this.publishedStoreId(storeSlug);
    const product = await this.productService.getProductById(
      storeId,
      productId,
    );
    const category = await this.categoryService.getCategoryById(
      storeId,
      product.categoryId,
    );
    if (!product.isActive || !category.isActive) {
      throw new NotFoundError('Product not found');
    }

    return toMenuProduct(product, await this.optionGroupsFor([product]));
  }

  private async publishedStoreId(storeSlug: string): Promise<string> {
    const { store } =
      await this.storeService.getPublishedStoreBySlug(storeSlug);
    return store.id;
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
