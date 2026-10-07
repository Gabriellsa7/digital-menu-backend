import { ICategory } from '../interfaces/category.interface';

export interface ICategoryRepositoryRead {
  findCategoryById(id: string): Promise<ICategory | null>;
  findCategoryByName(name: string): Promise<ICategory | null>;
  listCategories(): Promise<ICategory[]>;
  findMaxCategoryPosition(): Promise<number>;
}
