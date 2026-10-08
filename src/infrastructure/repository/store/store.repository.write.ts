import { UpdateQuery } from 'mongoose';
import { IStore } from '../../../domain/store/interfaces/store.interface';
import {
  IParamsUpdateStoreFields,
  IStoreRepositoryWrite,
} from '../../../domain/store/repository/store.repository.write';
import { Mstore } from '../../db/mongo/models/store.model';
import {
  HIDE_STORE_INTERNAL_FIELDS,
  IMStore,
  STORE_SINGLETON_FILTER,
} from '../../db/mongo/schema/store.schema';

export class StoreRepositoryWrite implements IStoreRepositoryWrite {
  async createStoreIfMissing(store: IStore): Promise<IStore> {
    const { createdAt, updatedAt, ...fields } = store;
    const created = await Mstore.findOneAndUpdate(
      STORE_SINGLETON_FILTER,
      { $setOnInsert: fields },
      { upsert: true, new: true, projection: HIDE_STORE_INTERNAL_FIELDS },
    ).lean<IStore>();
    return created!;
  }

  async updateStore({
    set = {},
    unset = [],
  }: IParamsUpdateStoreFields): Promise<IStore | null> {
    const update: UpdateQuery<IMStore> = {};
    if (Object.keys(set).length > 0) {
      update.$set = set;
    }
    if (unset.length > 0) {
      update.$unset = Object.fromEntries(unset.map((field) => [field, '']));
    }
    return Mstore.findOneAndUpdate(STORE_SINGLETON_FILTER, update, {
      new: true,
      projection: HIDE_STORE_INTERNAL_FIELDS,
    }).lean<IStore>();
  }
}
