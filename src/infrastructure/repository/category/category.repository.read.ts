import { ICategory } from '../../../domain/category/interfaces/category.interface';
import { ICategoryRepositoryRead } from '../../../domain/category/repository/category.repository.read';
import { Mcategory } from '../../db/mongo/models/category.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';
import { CASE_INSENSITIVE_COLLATION } from '../../db/mongo/schema/category.schema';

export class CategoryRepositoryRead implements ICategoryRepositoryRead {
  async findCategoryById(id: string): Promise<ICategory | null> {
    return Mcategory.findOne(
      { id },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<ICategory>();
  }

  async findCategoryByName(
    storeId: string,
    name: string,
  ): Promise<ICategory | null> {
    return Mcategory.findOne({ storeId, name }, HIDE_MONGO_INTERNAL_FIELDS)
      .collation(CASE_INSENSITIVE_COLLATION)
      .lean<ICategory>();
  }

  async listCategories(storeId: string): Promise<ICategory[]> {
    return Mcategory.find({ storeId }, HIDE_MONGO_INTERNAL_FIELDS)
      .sort({ position: 1, createdAt: 1 })
      .lean<ICategory[]>();
  }

  async findMaxCategoryPosition(storeId: string): Promise<number> {
    const last = await Mcategory.findOne({ storeId }, { position: 1 })
      .sort({ position: -1 })
      .lean<Pick<ICategory, 'position'>>();
    return last?.position ?? -1;
  }
}
