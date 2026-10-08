import { IStore } from '../interfaces/store.interface';

export interface IStoreRepositoryRead {
  findStoreById(id: string): Promise<IStore | null>;
  findStoreBySlug(slug: string): Promise<IStore | null>;
  findFirstStore(): Promise<IStore | null>;
  listActiveStores(): Promise<IStore[]>;
}
