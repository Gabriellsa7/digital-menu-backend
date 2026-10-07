import { IStore } from '../interfaces/store.interface';

export interface IStoreRepositoryRead {
  findStore(): Promise<IStore | null>;
}
