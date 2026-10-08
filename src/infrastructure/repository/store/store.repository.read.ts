import { IStore } from '../../../domain/store/interfaces/store.interface';
import { IStoreRepositoryRead } from '../../../domain/store/repository/store.repository.read';
import { Mstore } from '../../db/mongo/models/store.model';
import {
  HIDE_STORE_INTERNAL_FIELDS,
  STORE_SINGLETON_FILTER,
} from '../../db/mongo/schema/store.schema';

export class StoreRepositoryRead implements IStoreRepositoryRead {
  async findStore(): Promise<IStore | null> {
    return Mstore.findOne(STORE_SINGLETON_FILTER, HIDE_STORE_INTERNAL_FIELDS)
      .lean<IStore>();
  }
}
