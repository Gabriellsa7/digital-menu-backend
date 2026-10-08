import { IOptionGroup } from '../interfaces/option-group.interface';

export interface IOptionGroupRepositoryRead {
  findOptionGroupById(id: string): Promise<IOptionGroup | null>;
  findOptionGroupsByIds(ids: string[]): Promise<IOptionGroup[]>;
  listOptionGroups(): Promise<IOptionGroup[]>;
}
