import { IClock } from '../../common/clock.interface';
import { IStoreEventPublisher } from '../../store/events/store.event.publisher';
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
  storeId: string;
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
  storeId: string;
  optionGroupId: string;
  optionId: string;
  isAvailable: boolean;
}

export interface IParamsOptionGroupService {
  optionGroupRepositoryRead: IOptionGroupRepositoryRead;
  optionGroupRepositoryWrite: IOptionGroupRepositoryWrite;
  optionGroupUsage: IOptionGroupUsage;
  storeEventPublisher: IStoreEventPublisher;
  clock: IClock;
}

export interface IOptionGroupService {
  listOptionGroups(storeId: string): Promise<IOptionGroup[]>;
  getOptionGroupById(storeId: string, id: string): Promise<IOptionGroup>;
  findOptionGroupsByIds(
    storeId: string,
    ids: string[],
  ): Promise<IOptionGroup[]>;
  createOptionGroup(params: IParamsOptionGroupData): Promise<IOptionGroup>;
  updateOptionGroup(params: IParamsUpdateOptionGroup): Promise<IOptionGroup>;
  deleteOptionGroup(storeId: string, id: string): Promise<void>;
  setOptionAvailability(
    params: IParamsSetOptionAvailability,
  ): Promise<IOptionGroup>;
}
