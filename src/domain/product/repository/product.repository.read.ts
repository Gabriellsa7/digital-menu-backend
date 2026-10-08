import {
  IPaginatedResult,
  IPagination,
} from '../../common/pagination.interface';
import { IProduct } from '../interfaces/product.interface';

export interface IParamsListProducts extends IPagination {
  storeId: string;
  categoryId?: string;
  search?: string;
}

export interface IProductRepositoryRead {
  findProductById(id: string): Promise<IProduct | null>;
  findProductsByIds(storeId: string, ids: string[]): Promise<IProduct[]>;
  listProducts(params: IParamsListProducts): Promise<IPaginatedResult<IProduct>>;
  listProductsInCategory(categoryId: string): Promise<IProduct[]>;
  listActiveProducts(storeId: string): Promise<IProduct[]>;
  findMaxPositionInCategory(categoryId: string): Promise<number>;
}
