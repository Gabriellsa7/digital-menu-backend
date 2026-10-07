import { ICategory } from '../../../domain/category/interfaces/category.interface';
import {
  ICategoryRepositoryWrite,
  TCategoryUpdatableFields,
} from '../../../domain/category/repository/category.repository.write';
import { Mcategory } from '../../db/mongo/models/category.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class CategoryRepositoryWrite implements ICategoryRepositoryWrite {
  async createCategory(category: ICategory): Promise<ICategory> {
    const created = await Mcategory.create({ ...category });
    const { _id, __v, ...createdCategory } = created.toObject();
    return createdCategory;
  }

  async updateCategoryById(
    id: string,
    fields: TCategoryUpdatableFields,
  ): Promise<ICategory | null> {
    return Mcategory.findOneAndUpdate(
      { id },
      { $set: fields },
      { new: true, projection: HIDE_MONGO_INTERNAL_FIELDS },
    ).lean<ICategory>();
  }

  async deleteCategoryById(id: string): Promise<boolean> {
    const { deletedCount } = await Mcategory.deleteOne({ id });
    return deletedCount === 1;
  }

  async reorderCategories(orderedIds: string[]): Promise<void> {
    await Mcategory.bulkWrite(
      orderedIds.map((id, position) => ({
        updateOne: { filter: { id }, update: { $set: { position } } },
      })),
    );
  }
}
