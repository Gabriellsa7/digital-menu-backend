import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { ICategoryService } from '../../category/interfaces/category.service.interface';
import { IClock } from '../../common/clock.interface';
import { IPaginatedResult } from '../../common/pagination.interface';
import { assertValidImage } from '../../common/image';
import { assertCompleteOrder } from '../../common/reorder';
import {
  IImageFile,
  IStorageProvider,
} from '../../common/storage.provider.interface';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { NotFoundError } from '../../errors/not-found.error';
import { assertValidPromotion } from '../product-pricing';
import { IOptionGroup } from '../../option-group/interfaces/option-group.interface';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import { IStoreEventPublisher } from '../../store/events/store.event.publisher';
import { IProduct } from '../interfaces/product.interface';
import {
  IParamsProductData,
  IParamsProductService,
  IParamsSetProductAvailability,
  IParamsSetProductFeatured,
  IParamsSetProductPromotion,
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

const PRODUCT_IMAGES_FOLDER = 'digital-menu/stores';
const MAX_FEATURED_PRODUCTS = 5;

export class ProductService implements IProductService {
  private productRepositoryRead: IProductRepositoryRead;
  private productRepositoryWrite: IProductRepositoryWrite;
  private categoryService: ICategoryService;
  private optionGroupService: IOptionGroupService;
  private storageProvider: IStorageProvider;
  private storeEventPublisher: IStoreEventPublisher;
  private clock: IClock;

  constructor({
    productRepositoryRead,
    productRepositoryWrite,
    categoryService,
    optionGroupService,
    storageProvider,
    storeEventPublisher,
    clock,
  }: IParamsProductService) {
    this.productRepositoryRead = productRepositoryRead;
    this.productRepositoryWrite = productRepositoryWrite;
    this.categoryService = categoryService;
    this.optionGroupService = optionGroupService;
    this.storageProvider = storageProvider;
    this.storeEventPublisher = storeEventPublisher;
    this.clock = clock;
  }

  @ErrorHandler()
  async listProducts(
    params: IParamsListProducts,
  ): Promise<IPaginatedResult<IProduct>> {
    return this.productRepositoryRead.listProducts(params);
  }

  @ErrorHandler()
  async getProductById(storeId: string, id: string): Promise<IProduct> {
    const product = await this.productRepositoryRead.findProductById(id);

    return product?.storeId === storeId
      ? product
      : this.throwProductNotFound();
  }

  @ErrorHandler()
  async listActiveProducts(storeId: string): Promise<IProduct[]> {
    return this.productRepositoryRead.listActiveProducts(storeId);
  }

  @ErrorHandler()
  async findProductsByIds(
    storeId: string,
    ids: string[],
  ): Promise<IProduct[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.productRepositoryRead.findProductsByIds(storeId, ids);
  }

  @ErrorHandler()
  async createProduct(params: IParamsProductData): Promise<IProduct> {
    const now = this.clock.now();
    const product = new Product({
      ...params,
      id: randomUUID(),
      isFeatured: false,
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
    const current = await this.getProductById(params.storeId, id);
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
      unset: [
        ...(servesPeople === undefined ? (['servesPeople'] as const) : []),
        ...(this.isPromotionAboveNewPrice(current, product.priceInCents)
          ? (['promotion'] as const)
          : []),
      ],
    });
  }

  @ErrorHandler()
  async deleteProduct(storeId: string, id: string): Promise<void> {
    const product = await this.getProductById(storeId, id);
    const deleted = await this.productRepositoryWrite.deleteProductById(id);
    if (!deleted) {
      this.throwProductNotFound();
    }
    await this.deleteImageIfAny(product.imagePublicId);
  }

  @ErrorHandler()
  async setProductAvailability({
    storeId,
    id,
    isAvailable,
  }: IParamsSetProductAvailability): Promise<IProduct> {
    await this.getProductById(storeId, id);
    const product = await this.updateProductFields(id, {
      set: { isAvailable },
    });
    this.storeEventPublisher.publishProductAvailabilityChanged(
      storeId,
      id,
      isAvailable,
    );
    return product;
  }

  @ErrorHandler()
  async reorderProductsInCategory(
    storeId: string,
    categoryId: string,
    orderedIds: string[],
  ): Promise<IProduct[]> {
    await this.categoryService.getCategoryById(storeId, categoryId);
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

  @ErrorHandler()
  async setProductImage(
    storeId: string,
    id: string,
    file?: IImageFile,
  ): Promise<IProduct> {
    assertValidImage(file);
    const product = await this.getProductById(storeId, id);
    const uploaded = await this.storageProvider.uploadImage({
      file,
      folder: `${PRODUCT_IMAGES_FOLDER}/${storeId}/products`,
    });

    const updated = await this.updateProductFields(id, {
      set: { imageUrl: uploaded.url, imagePublicId: uploaded.publicId },
    });
    await this.deleteImageIfAny(product.imagePublicId);
    return updated;
  }

  @ErrorHandler()
  async removeProductImage(storeId: string, id: string): Promise<IProduct> {
    const product = await this.getProductById(storeId, id);
    const updated = await this.updateProductFields(id, {
      unset: ['imageUrl', 'imagePublicId'],
    });
    await this.deleteImageIfAny(product.imagePublicId);
    return updated;
  }

  @ErrorHandler()
  async setProductPromotion({
    storeId,
    id,
    promotion,
  }: IParamsSetProductPromotion): Promise<IProduct> {
    const product = await this.getProductById(storeId, id);
    assertValidPromotion(product.priceInCents, promotion);

    return this.updateProductFields(id, { set: { promotion } });
  }

  @ErrorHandler()
  async removeProductPromotion(storeId: string, id: string): Promise<IProduct> {
    await this.getProductById(storeId, id);

    return this.updateProductFields(id, { unset: ['promotion'] });
  }

  @ErrorHandler()
  async setProductFeatured({
    storeId,
    id,
    isFeatured,
  }: IParamsSetProductFeatured): Promise<IProduct> {
    const product = await this.getProductById(storeId, id);
    if (isFeatured && !product.isFeatured) {
      const featured =
        await this.productRepositoryRead.countFeaturedProducts(storeId);
      if (featured >= MAX_FEATURED_PRODUCTS) {
        throw new BusinessRuleError(
          `A store can feature at most ${MAX_FEATURED_PRODUCTS} products`,
          'FEATURED_LIMIT',
          { limit: MAX_FEATURED_PRODUCTS },
        );
      }
    }

    return this.updateProductFields(id, { set: { isFeatured } });
  }

  private isPromotionAboveNewPrice(
    current: IProduct,
    priceInCents: number,
  ): boolean {
    return (
      current.promotion !== undefined &&
      current.promotion.priceInCents >= priceInCents
    );
  }

  private async deleteImageIfAny(publicId?: string): Promise<void> {
    if (publicId) {
      await this.storageProvider.deleteImage(publicId);
    }
  }

  private async assertValidProduct(product: Product): Promise<void> {
    await this.categoryService.getCategoryById(
      product.storeId,
      product.categoryId,
    );
    const optionGroups = await this.findOptionGroupsOrThrow(
      product.storeId,
      product.optionGroupIds,
    );
    product.assertPricing(optionGroups);
  }

  private async findOptionGroupsOrThrow(
    storeId: string,
    optionGroupIds: string[],
  ): Promise<IOptionGroup[]> {
    const optionGroups = await this.optionGroupService.findOptionGroupsByIds(
      storeId,
      optionGroupIds,
    );
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
