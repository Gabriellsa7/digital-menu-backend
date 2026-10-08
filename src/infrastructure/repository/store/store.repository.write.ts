import { UpdateQuery } from 'mongoose';
import { IStore } from '../../../domain/store/interfaces/store.interface';
import {
  IParamsUpdateStoreFields,
  IStoreRepositoryWrite,
} from '../../../domain/store/repository/store.repository.write';
import { Mstore } from '../../db/mongo/models/store.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';
import { IMStore } from '../../db/mongo/schema/store.schema';

export class StoreRepositoryWrite implements IStoreRepositoryWrite {
  async createStore(store: IStore): Promise<IStore> {
    const created = await Mstore.create({ ...store });
    const { _id, __v, ...createdStore } = created.toObject();
    return createdStore;
  }

  async updateStore(
    id: string,
    { set = {}, unset = [] }: IParamsUpdateStoreFields,
  ): Promise<IStore | null> {
    const update: UpdateQuery<IMStore> = {};
    if (Object.keys(set).length > 0) {
      update.$set = set;
    }
    if (unset.length > 0) {
      update.$unset = Object.fromEntries(unset.map((field) => [field, '']));
    }
    return Mstore.findOneAndUpdate({ id }, update, {
      new: true,
      projection: HIDE_MONGO_INTERNAL_FIELDS,
    }).lean<IStore>();
  }
}
