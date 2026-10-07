import { IClock } from '../../common/clock.interface';
import { ICategoryRepositoryRead } from '../repository/category.repository.read';
import { ICategoryRepositoryWrite } from '../repository/category.repository.write';
import { ICategory } from './category.interface';
import { ICategoryUsage } from './category-usage.interface';

export interface IParamsCreateCategory {
  name: string;
  isActive?: boolean;
}

export interface IParamsUpdateCategory {
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
  listCategories(): Promise<ICategory[]>;
  getCategoryById(id: string): Promise<ICategory>;
  createCategory(params: IParamsCreateCategory): Promise<ICategory>;
  updateCategory(params: IParamsUpdateCategory): Promise<ICategory>;
  deleteCategory(id: string): Promise<void>;
  reorderCategories(orderedIds: string[]): Promise<ICategory[]>;
}
