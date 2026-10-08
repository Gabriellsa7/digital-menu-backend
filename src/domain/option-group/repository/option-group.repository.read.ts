import { IOptionGroup } from '../interfaces/option-group.interface';

export interface IOptionGroupRepositoryRead {
  findOptionGroupById(id: string): Promise<IOptionGroup | null>;
  findOptionGroupsByIds(
    storeId: string,
    ids: string[],
  ): Promise<IOptionGroup[]>;
  listOptionGroups(storeId: string): Promise<IOptionGroup[]>;
}
