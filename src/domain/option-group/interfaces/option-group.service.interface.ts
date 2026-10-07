import { IClock } from '../../common/clock.interface';
import { IOptionGroupRepositoryRead } from '../repository/option-group.repository.read';
import { IOptionGroupRepositoryWrite } from '../repository/option-group.repository.write';
import { IOptionGroup } from './option-group.interface';
import { IOptionGroupUsage } from './option-group-usage.interface';

export interface IParamsOptionData {
  id?: string;
  name: string;
  priceInCents: number;
  isAvailable?: boolean;
}

export interface IParamsOptionGroupData {
  name: string;
  minSelections: number;
  maxSelections: number;
  allowRepeat: boolean;
  options: IParamsOptionData[];
}

export interface IParamsUpdateOptionGroup extends IParamsOptionGroupData {
  id: string;
}

export interface IParamsSetOptionAvailability {
  optionGroupId: string;
  optionId: string;
  isAvailable: boolean;
}

export interface IParamsOptionGroupService {
  optionGroupRepositoryRead: IOptionGroupRepositoryRead;
  optionGroupRepositoryWrite: IOptionGroupRepositoryWrite;
  optionGroupUsage: IOptionGroupUsage;
  clock: IClock;
}

export interface IOptionGroupService {
  listOptionGroups(): Promise<IOptionGroup[]>;
  getOptionGroupById(id: string): Promise<IOptionGroup>;
  findOptionGroupsByIds(ids: string[]): Promise<IOptionGroup[]>;
  createOptionGroup(params: IParamsOptionGroupData): Promise<IOptionGroup>;
  updateOptionGroup(params: IParamsUpdateOptionGroup): Promise<IOptionGroup>;
  deleteOptionGroup(id: string): Promise<void>;
  setOptionAvailability(
    params: IParamsSetOptionAvailability,
  ): Promise<IOptionGroup>;
}
