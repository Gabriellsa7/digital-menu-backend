import { IClock } from '../../common/clock.interface';
import { ICategoryRepositoryRead } from '../repository/category.repository.read';
import { ICategoryRepositoryWrite } from '../repository/category.repository.write';
import { ICategory } from './category.interface';
import { ICategoryUsage } from './category-usage.interface';

export interface IParamsCreateCategory {
  storeId: string;
  name: string;
  isActive?: boolean;
}

export interface IParamsUpdateCategory {
  storeId: string;
  id: string;
  name?: string;
  isActive?: boolean;
}

export interface IParamsCategoryService {
  categoryRepositoryRead: ICategoryRepositoryRead;
  categoryRepositoryWrite: ICategoryRepositoryWrite;
  categoryUsage: ICategoryUsage;
  clock: IClock;
}

export interface ICategoryService {
  listCategories(storeId: string): Promise<ICategory[]>;
  getCategoryById(storeId: string, id: string): Promise<ICategory>;
  createCategory(params: IParamsCreateCategory): Promise<ICategory>;
  updateCategory(params: IParamsUpdateCategory): Promise<ICategory>;
  deleteCategory(storeId: string, id: string): Promise<void>;
  reorderCategories(storeId: string, orderedIds: string[]): Promise<ICategory[]>;
}
