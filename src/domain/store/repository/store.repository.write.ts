import { IStore } from '../interfaces/store.interface';

export type TOptionalStoreField =
  | 'logoUrl'
  | 'logoPublicId'
  | 'bannerUrl'
  | 'bannerPublicId'
  | 'manualStatusUntil';

export interface IParamsUpdateStoreFields {
  set?: Partial<Omit<IStore, 'id' | 'createdAt' | 'updatedAt'>>;
  unset?: TOptionalStoreField[];
}

export interface IStoreRepositoryWrite {
  createStore(store: IStore): Promise<IStore>;
  updateStore(
    id: string,
    fields: IParamsUpdateStoreFields,
  ): Promise<IStore | null>;
}
