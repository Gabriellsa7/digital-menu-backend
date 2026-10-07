import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { ICategoryService } from '../../category/interfaces/category.service.interface';
import { IClock } from '../../common/clock.interface';
import { IPaginatedResult } from '../../common/pagination.interface';
import { assertCompleteOrder } from '../../common/reorder';
import { NotFoundError } from '../../errors/not-found.error';
import { IOptionGroup } from '../../option-group/interfaces/option-group.interface';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import { IProduct } from '../interfaces/product.interface';
import {
  IParamsProductData,
  IParamsProductService,
  IParamsSetProductAvailability,
  IParamsUpdateProduct,
  IProductService,
} from '../interfaces/product.service.interface';
import { Product } from '../product.entity';
import {
  IParamsListProducts,
  IProductRepositoryRead,
} from '../repository/product.repository.read';
import {
  IParamsUpdateProductFields,
  IProductRepositoryWrite,
} from '../repository/product.repository.write';

export class ProductService implements IProductService {
  private productRepositoryRead: IProductRepositoryRead;
  private productRepositoryWrite: IProductRepositoryWrite;
  private categoryService: ICategoryService;
  private optionGroupService: IOptionGroupService;
  private clock: IClock;

  constructor({
    productRepositoryRead,
    productRepositoryWrite,
    categoryService,
    optionGroupService,
    clock,
  }: IParamsProductService) {
    this.productRepositoryRead = productRepositoryRead;
    this.productRepositoryWrite = productRepositoryWrite;
    this.categoryService = categoryService;
    this.optionGroupService = optionGroupService;
    this.clock = clock;
  }

  @ErrorHandler()
  async listProducts(
    params: IParamsListProducts,
  ): Promise<IPaginatedResult<IProduct>> {
    return this.productRepositoryRead.listProducts(params);
  }

  @ErrorHandler()
  async getProductById(id: string): Promise<IProduct> {
    const product = await this.productRepositoryRead.findProductById(id);

    return product ? product : this.throwProductNotFound();
  }

  @ErrorHandler()
  async findProductsByIds(ids: string[]): Promise<IProduct[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.productRepositoryRead.findProductsByIds(ids);
  }

  @ErrorHandler()
  async createProduct(params: IParamsProductData): Promise<IProduct> {
    const now = this.clock.now();
    const product = new Product({
      ...params,
      id: randomUUID(),
      position: await this.nextPositionIn(params.categoryId),
      createdAt: now,
      updatedAt: now,
    });
    await this.assertValidProduct(product);

    return this.productRepositoryWrite.createProduct(product);
  }

  @ErrorHandler()
  async updateProduct({
    id,
    servesPeople,
    ...params
  }: IParamsUpdateProduct): Promise<IProduct> {
    const current = await this.getProductById(id);
    const position =
      current.categoryId === params.categoryId
        ? current.position
        : await this.nextPositionIn(params.categoryId);
    const product = new Product({
      ...current,
      ...params,
      servesPeople,
      position,
    });
    await this.assertValidProduct(product);

    return this.updateProductFields(id, {
      set: {
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        priceInCents: product.priceInCents,
        optionGroupIds: product.optionGroupIds,
        isAvailable: product.isAvailable,
        isActive: product.isActive,
        position: product.position,
        ...(servesPeople !== undefined && { servesPeople }),
      },
      ...(servesPeople === undefined && { unset: ['servesPeople'] }),
    });
  }

  @ErrorHandler()
  async deleteProduct(id: string): Promise<void> {
    const deleted = await this.productRepositoryWrite.deleteProductById(id);
    if (!deleted) {
      this.throwProductNotFound();
    }
  }

  @ErrorHandler()
  async setProductAvailability({
    id,
    isAvailable,
  }: IParamsSetProductAvailability): Promise<IProduct> {
    return this.updateProductFields(id, { set: { isAvailable } });
  }

  @ErrorHandler()
  async reorderProductsInCategory(
    categoryId: string,
    orderedIds: string[],
  ): Promise<IProduct[]> {
    await this.categoryService.getCategoryById(categoryId);
    const products =
      await this.productRepositoryRead.listProductsInCategory(categoryId);
    assertCompleteOrder(
      orderedIds,
      products.map(({ id }) => id),
    );
    await this.productRepositoryWrite.reorderProductsInCategory(
      categoryId,
      orderedIds,
    );

    return this.productRepositoryRead.listProductsInCategory(categoryId);
  }

  private async assertValidProduct(product: Product): Promise<void> {
    await this.categoryService.getCategoryById(product.categoryId);
    const optionGroups = await this.findOptionGroupsOrThrow(
      product.optionGroupIds,
    );
    product.assertPricing(optionGroups);
  }

  private async findOptionGroupsOrThrow(
    optionGroupIds: string[],
  ): Promise<IOptionGroup[]> {
    const optionGroups =
      await this.optionGroupService.findOptionGroupsByIds(optionGroupIds);
    const foundIds = new Set(optionGroups.map(({ id }) => id));
    const missingIds = optionGroupIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundError(`Option group not found: ${missingIds[0]}`);
    }
    return optionGroups;
  }

  private async nextPositionIn(categoryId: string): Promise<number> {
    return (
      (await this.productRepositoryRead.findMaxPositionInCategory(categoryId)) +
      1
    );
  }

  private async updateProductFields(
    id: string,
    fields: IParamsUpdateProductFields,
  ): Promise<IProduct> {
    const updated = await this.productRepositoryWrite.updateProductById(
      id,
      fields,
    );

    return updated ? updated : this.throwProductNotFound();
  }

  private throwProductNotFound(): never {
    throw new NotFoundError('Product not found');
  }
}
