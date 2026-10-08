import { IStore } from '../../../domain/store/interfaces/store.interface';
import { IStoreRepositoryRead } from '../../../domain/store/repository/store.repository.read';
import { Mstore } from '../../db/mongo/models/store.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

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

  async listActiveStores(): Promise<IStore[]> {
    return Mstore.find({ isActive: true }, HIDE_MONGO_INTERNAL_FIELDS).lean<
      IStore[]
    >();
  }
}
