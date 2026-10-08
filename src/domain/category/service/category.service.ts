import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { IClock } from '../../common/clock.interface';
import { assertCompleteOrder } from '../../common/reorder';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { ConflictError } from '../../errors/conflict.error';
import { NotFoundError } from '../../errors/not-found.error';
import { Category } from '../category.entity';
import { ICategory } from '../interfaces/category.interface';
import { ICategoryUsage } from '../interfaces/category-usage.interface';
import {
  ICategoryService,
  IParamsCategoryService,
  IParamsCreateCategory,
  IParamsUpdateCategory,
} from '../interfaces/category.service.interface';
import { ICategoryRepositoryRead } from '../repository/category.repository.read';
import { ICategoryRepositoryWrite } from '../repository/category.repository.write';

export class CategoryService implements ICategoryService {
  private categoryRepositoryRead: ICategoryRepositoryRead;
  private categoryRepositoryWrite: ICategoryRepositoryWrite;
  private categoryUsage: ICategoryUsage;
  private clock: IClock;

  constructor({
    categoryRepositoryRead,
    categoryRepositoryWrite,
    categoryUsage,
    clock,
  }: IParamsCategoryService) {
    this.categoryRepositoryRead = categoryRepositoryRead;
    this.categoryRepositoryWrite = categoryRepositoryWrite;
    this.categoryUsage = categoryUsage;
    this.clock = clock;
  }

  @ErrorHandler()
  async listCategories(storeId: string): Promise<ICategory[]> {
    return this.categoryRepositoryRead.listCategories(storeId);
  }

  @ErrorHandler()
  async getCategoryById(storeId: string, id: string): Promise<ICategory> {
    const category = await this.categoryRepositoryRead.findCategoryById(id);

    return category?.storeId === storeId
      ? category
      : this.throwCategoryNotFound();
  }

  @ErrorHandler()
  async createCategory({
    storeId,
    name,
    isActive = true,
  }: IParamsCreateCategory): Promise<ICategory> {
    await this.assertUniqueName(storeId, name);
    const now = this.clock.now();
    const position =
      (await this.categoryRepositoryRead.findMaxCategoryPosition(storeId)) + 1;

    return this.categoryRepositoryWrite.createCategory(
      new Category({
        id: randomUUID(),
        storeId,
        name,
        position,
        isActive,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  @ErrorHandler()
  async updateCategory({
    storeId,
    id,
    name,
    isActive,
  }: IParamsUpdateCategory): Promise<ICategory> {
    await this.getCategoryById(storeId, id);
    if (name !== undefined) {
      await this.assertUniqueName(storeId, name, id);
    }

    const updated = await this.categoryRepositoryWrite.updateCategoryById(id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(isActive !== undefined && { isActive }),
    });
    return updated ? updated : this.throwCategoryNotFound();
  }

  @ErrorHandler()
  async deleteCategory(storeId: string, id: string): Promise<void> {
    await this.getCategoryById(storeId, id);
    const productCount = await this.categoryUsage.countProductsInCategory(id);
    if (productCount > 0) {
      throw new BusinessRuleError(
        'A category with products cannot be deleted. Deactivate it instead',
        'CATEGORY_NOT_EMPTY',
        { productCount },
      );
    }
    await this.categoryRepositoryWrite.deleteCategoryById(id);
  }

  @ErrorHandler()
  async reorderCategories(
    storeId: string,
    orderedIds: string[],
  ): Promise<ICategory[]> {
    const categories =
      await this.categoryRepositoryRead.listCategories(storeId);
    assertCompleteOrder(
      orderedIds,
      categories.map(({ id }) => id),
    );
    await this.categoryRepositoryWrite.reorderCategories(orderedIds);

    return this.categoryRepositoryRead.listCategories(storeId);
  }

  private async assertUniqueName(
    storeId: string,
    name: string,
    ownId?: string,
  ): Promise<void> {
    const existing = await this.categoryRepositoryRead.findCategoryByName(
      storeId,
      name.trim(),
    );
    if (existing && existing.id !== ownId) {
      throw new ConflictError(
        'A category with this name already exists',
        'CATEGORY_NAME_IN_USE',
      );
    }
  }

  private throwCategoryNotFound(): never {
    throw new NotFoundError('Category not found');
  }
}
