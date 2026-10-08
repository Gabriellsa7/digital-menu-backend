import { ICategoryService } from '../../category/interfaces/category.service.interface';
import { IClock } from '../../common/clock.interface';
import { IPaginatedResult } from '../../common/pagination.interface';
import {
  IImageFile,
  IStorageProvider,
} from '../../common/storage.provider.interface';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import {
  IParamsListProducts,
  IProductRepositoryRead,
} from '../repository/product.repository.read';
import { IStoreEventPublisher } from '../../store/events/store.event.publisher';
import { IProductRepositoryWrite } from '../repository/product.repository.write';
import { IProduct, IProductPromotion } from './product.interface';

export interface IParamsProductData {
  storeId: string;
  categoryId: string;
  name: string;
  description: string;
  priceInCents: number;
  optionGroupIds: string[];
  isAvailable: boolean;
  isActive: boolean;
  servesPeople?: number;
}

export interface IParamsUpdateProduct extends IParamsProductData {
  id: string;
}

export interface IParamsSetProductAvailability {
  storeId: string;
  id: string;
  isAvailable: boolean;
}

export interface IParamsSetProductPromotion {
  storeId: string;
  id: string;
  promotion: IProductPromotion;
}

export interface IParamsSetProductFeatured {
  storeId: string;
  id: string;
  isFeatured: boolean;
}

export interface IParamsProductService {
  productRepositoryRead: IProductRepositoryRead;
  productRepositoryWrite: IProductRepositoryWrite;
  categoryService: ICategoryService;
  optionGroupService: IOptionGroupService;
  storageProvider: IStorageProvider;
  storeEventPublisher: IStoreEventPublisher;
  clock: IClock;
}

export interface IProductService {
  listProducts(params: IParamsListProducts): Promise<IPaginatedResult<IProduct>>;
  getProductById(storeId: string, id: string): Promise<IProduct>;
  listActiveProducts(storeId: string): Promise<IProduct[]>;
  findProductsByIds(storeId: string, ids: string[]): Promise<IProduct[]>;
  createProduct(params: IParamsProductData): Promise<IProduct>;
  updateProduct(params: IParamsUpdateProduct): Promise<IProduct>;
  deleteProduct(storeId: string, id: string): Promise<void>;
  setProductAvailability(
    params: IParamsSetProductAvailability,
  ): Promise<IProduct>;
  reorderProductsInCategory(
    storeId: string,
    categoryId: string,
    orderedIds: string[],
  ): Promise<IProduct[]>;
  setProductImage(
    storeId: string,
    id: string,
    file?: IImageFile,
  ): Promise<IProduct>;
  removeProductImage(storeId: string, id: string): Promise<IProduct>;
  setProductPromotion(params: IParamsSetProductPromotion): Promise<IProduct>;
  removeProductPromotion(storeId: string, id: string): Promise<IProduct>;
  setProductFeatured(params: IParamsSetProductFeatured): Promise<IProduct>;
}
