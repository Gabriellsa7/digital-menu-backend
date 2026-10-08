import { RootFilterQuery } from 'mongoose';
import { IPaginatedResult } from '../../../domain/common/pagination.interface';
import { IProduct } from '../../../domain/product/interfaces/product.interface';
import {
  IParamsListProducts,
  IProductRepositoryRead,
} from '../../../domain/product/repository/product.repository.read';
import { Mproduct } from '../../db/mongo/models/product.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';
import { IMProduct } from '../../db/mongo/schema/product.schema';

const DISPLAY_ORDER = { categoryId: 1, position: 1, createdAt: 1 } as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class ProductRepositoryRead implements IProductRepositoryRead {
  async findProductById(id: string): Promise<IProduct | null> {
    return Mproduct.findOne(
      { id },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IProduct>();
  }

  async findProductsByIds(
    storeId: string,
    ids: string[],
  ): Promise<IProduct[]> {
    return Mproduct.find(
      { storeId, id: { $in: ids } },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IProduct[]>();
  }

  async listProducts({
    storeId,
    categoryId,
    search,
    limit,
    offset,
  }: IParamsListProducts): Promise<IPaginatedResult<IProduct>> {
    const filter: RootFilterQuery<IMProduct> = {
      storeId,
      ...(categoryId && { categoryId }),
      ...(search && {
        name: { $regex: escapeRegex(search.trim()), $options: 'i' },
      }),
    };
    const [items, total] = await Promise.all([
      Mproduct.find(filter, HIDE_MONGO_INTERNAL_FIELDS)
        .sort(DISPLAY_ORDER)
        .skip(offset)
        .limit(limit)
        .lean<IProduct[]>(),
      Mproduct.countDocuments(filter),
    ]);
    return { items, total };
  }

  async listProductsInCategory(categoryId: string): Promise<IProduct[]> {
    return Mproduct.find({ categoryId }, HIDE_MONGO_INTERNAL_FIELDS)
      .sort(DISPLAY_ORDER)
      .lean<IProduct[]>();
  }

  async listActiveProducts(storeId: string): Promise<IProduct[]> {
    return Mproduct.find(
      { storeId, isActive: true },
      HIDE_MONGO_INTERNAL_FIELDS,
    )
      .sort(DISPLAY_ORDER)
      .lean<IProduct[]>();
  }

  async countFeaturedProducts(storeId: string): Promise<number> {
    return Mproduct.countDocuments({ storeId, isFeatured: true });
  }

  async findMaxPositionInCategory(categoryId: string): Promise<number> {
    const last = await Mproduct.findOne({ categoryId }, { position: 1 })
      .sort({ position: -1 })
      .lean<Pick<IProduct, 'position'>>();
    return last?.position ?? -1;
  }
}
