import {
  IPaginatedResult,
  IPagination,
} from '../../common/pagination.interface';
import { IStore } from '../interfaces/store.interface';

export interface IParamsListPublishedStores extends IPagination {
  search?: string;
}

export interface IStoreRepositoryRead {
  findStoreById(id: string): Promise<IStore | null>;
  findStoreBySlug(slug: string): Promise<IStore | null>;
  findFirstStore(): Promise<IStore | null>;
  listActiveStores(): Promise<IStore[]>;
  listPublishedStores(
    params: IParamsListPublishedStores,
  ): Promise<IPaginatedResult<IStore>>;
}
