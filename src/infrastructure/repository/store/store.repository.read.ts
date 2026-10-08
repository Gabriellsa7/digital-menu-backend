import { IStore } from '../../../domain/store/interfaces/store.interface';
import { IPaginatedResult } from '../../../domain/common/pagination.interface';
import {
  IParamsListPublishedStores,
  IStoreRepositoryRead,
} from '../../../domain/store/repository/store.repository.read';
import { Mstore } from '../../db/mongo/models/store.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class StoreRepositoryRead implements IStoreRepositoryRead {
  async findStoreById(id: string): Promise<IStore | null> {
    return Mstore.findOne({ id }, HIDE_MONGO_INTERNAL_FIELDS).lean<IStore>();
  }

  async findStoreBySlug(slug: string): Promise<IStore | null> {
    return Mstore.findOne({ slug }, HIDE_MONGO_INTERNAL_FIELDS).lean<IStore>();
  }

  async findFirstStore(): Promise<IStore | null> {
    return Mstore.findOne({}, HIDE_MONGO_INTERNAL_FIELDS)
      .sort({ createdAt: 1 })
      .lean<IStore>();
  }

  async listPublishedStores({
    search,
    limit,
    offset,
  }: IParamsListPublishedStores): Promise<IPaginatedResult<IStore>> {
    const term = search?.trim();
    const filter = {
      isActive: true,
      isPublished: true,
      ...(term && {
        name: { $regex: escapeRegex(term), $options: 'i' },
      }),
    };
    const [items, total] = await Promise.all([
      Mstore.find(filter, HIDE_MONGO_INTERNAL_FIELDS)
        .sort({ name: 1 })
        .skip(offset)
        .limit(limit)
        .lean<IStore[]>(),
      Mstore.countDocuments(filter),
    ]);
    return { items, total };
  }

  async listActiveStores(): Promise<IStore[]> {
    return Mstore.find({ isActive: true }, HIDE_MONGO_INTERNAL_FIELDS).lean<
      IStore[]
    >();
  }
}
