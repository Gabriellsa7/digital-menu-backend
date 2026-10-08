import { ICategory } from '../interfaces/category.interface';

export interface ICategoryRepositoryRead {
  findCategoryById(id: string): Promise<ICategory | null>;
  findCategoryByName(storeId: string, name: string): Promise<ICategory | null>;
  listCategories(storeId: string): Promise<ICategory[]>;
  findMaxCategoryPosition(storeId: string): Promise<number>;
}
