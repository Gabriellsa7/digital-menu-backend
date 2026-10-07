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
import { IProductRepositoryWrite } from '../repository/product.repository.write';
import { IProduct } from './product.interface';

export interface IParamsProductData {
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
  id: string;
  isAvailable: boolean;
}

export interface IParamsProductService {
  productRepositoryRead: IProductRepositoryRead;
  productRepositoryWrite: IProductRepositoryWrite;
  categoryService: ICategoryService;
  optionGroupService: IOptionGroupService;
  storageProvider: IStorageProvider;
  clock: IClock;
}

export interface IProductService {
  listProducts(params: IParamsListProducts): Promise<IPaginatedResult<IProduct>>;
  getProductById(id: string): Promise<IProduct>;
  findProductsByIds(ids: string[]): Promise<IProduct[]>;
  createProduct(params: IParamsProductData): Promise<IProduct>;
  updateProduct(params: IParamsUpdateProduct): Promise<IProduct>;
  deleteProduct(id: string): Promise<void>;
  setProductAvailability(
    params: IParamsSetProductAvailability,
  ): Promise<IProduct>;
  reorderProductsInCategory(
    categoryId: string,
    orderedIds: string[],
  ): Promise<IProduct[]>;
  setProductImage(id: string, file?: IImageFile): Promise<IProduct>;
  removeProductImage(id: string): Promise<IProduct>;
}
