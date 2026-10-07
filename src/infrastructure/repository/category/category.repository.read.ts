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

  async findCategoryByName(name: string): Promise<ICategory | null> {
    return Mcategory.findOne({ name }, HIDE_MONGO_INTERNAL_FIELDS)
      .collation(CASE_INSENSITIVE_COLLATION)
      .lean<ICategory>();
  }

  async listCategories(): Promise<ICategory[]> {
    return Mcategory.find({}, HIDE_MONGO_INTERNAL_FIELDS)
      .sort({ position: 1, createdAt: 1 })
      .lean<ICategory[]>();
  }

  async findMaxCategoryPosition(): Promise<number> {
    const last = await Mcategory.findOne({}, { position: 1 })
      .sort({ position: -1 })
      .lean<Pick<ICategory, 'position'>>();
    return last?.position ?? -1;
  }
}
