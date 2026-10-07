import {
  IPaginatedResult,
  IPagination,
} from '../../common/pagination.interface';
import { IProduct } from '../interfaces/product.interface';

export interface IParamsListProducts extends IPagination {
  categoryId?: string;
  search?: string;
}

export interface IProductRepositoryRead {
  findProductById(id: string): Promise<IProduct | null>;
  findProductsByIds(ids: string[]): Promise<IProduct[]>;
  listProducts(params: IParamsListProducts): Promise<IPaginatedResult<IProduct>>;
  listProductsInCategory(categoryId: string): Promise<IProduct[]>;
  listActiveProducts(): Promise<IProduct[]>;
  findMaxPositionInCategory(categoryId: string): Promise<number>;
}
