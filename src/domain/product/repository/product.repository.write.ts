import { IProduct } from '../interfaces/product.interface';

export type TOptionalProductField =
  | 'imageUrl'
  | 'imagePublicId'
  | 'servesPeople'
  | 'promotion';

export interface IParamsUpdateProductFields {
  set?: Partial<Omit<IProduct, 'id' | 'createdAt' | 'updatedAt'>>;
  unset?: TOptionalProductField[];
}

export interface IProductRepositoryWrite {
  createProduct(product: IProduct): Promise<IProduct>;
  updateProductById(
    id: string,
    fields: IParamsUpdateProductFields,
  ): Promise<IProduct | null>;
  deleteProductById(id: string): Promise<boolean>;
  reorderProductsInCategory(
    categoryId: string,
    orderedIds: string[],
  ): Promise<void>;
}
