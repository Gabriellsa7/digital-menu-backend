import { UpdateQuery } from 'mongoose';
import { IProduct } from '../../../domain/product/interfaces/product.interface';
import {
  IParamsUpdateProductFields,
  IProductRepositoryWrite,
} from '../../../domain/product/repository/product.repository.write';
import { Mproduct } from '../../db/mongo/models/product.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';
import { IMProduct } from '../../db/mongo/schema/product.schema';

export class ProductRepositoryWrite implements IProductRepositoryWrite {
  async createProduct(product: IProduct): Promise<IProduct> {
    const created = await Mproduct.create({ ...product });
    const { _id, __v, ...createdProduct } = created.toObject();
    return createdProduct;
  }

  async updateProductById(
    id: string,
    { set = {}, unset = [] }: IParamsUpdateProductFields,
  ): Promise<IProduct | null> {
    const update: UpdateQuery<IMProduct> = {};
    if (Object.keys(set).length > 0) {
      update.$set = set;
    }
    if (unset.length > 0) {
      update.$unset = Object.fromEntries(unset.map((field) => [field, '']));
    }
    return Mproduct.findOneAndUpdate({ id }, update, {
      new: true,
      projection: HIDE_MONGO_INTERNAL_FIELDS,
    }).lean<IProduct>();
  }

  async deleteProductById(id: string): Promise<boolean> {
    const { deletedCount } = await Mproduct.deleteOne({ id });
    return deletedCount === 1;
  }

  async reorderProductsInCategory(
    categoryId: string,
    orderedIds: string[],
  ): Promise<void> {
    await Mproduct.bulkWrite(
      orderedIds.map((id, position) => ({
        updateOne: {
          filter: { id, categoryId },
          update: { $set: { position } },
        },
      })),
    );
  }
}
