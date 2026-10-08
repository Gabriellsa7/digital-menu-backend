import { ICategory } from '../interfaces/category.interface';

export type TCategoryUpdatableFields = Partial<
  Pick<ICategory, 'name' | 'isActive'>
>;

export interface ICategoryRepositoryWrite {
  createCategory(category: ICategory): Promise<ICategory>;
  updateCategoryById(
    id: string,
    fields: TCategoryUpdatableFields,
  ): Promise<ICategory | null>;
  deleteCategoryById(id: string): Promise<boolean>;
  reorderCategories(orderedIds: string[]): Promise<void>;
}
