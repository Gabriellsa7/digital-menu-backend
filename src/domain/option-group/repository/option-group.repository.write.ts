import { IOptionGroup } from '../interfaces/option-group.interface';

export type TOptionGroupUpdatableFields = Omit<
  IOptionGroup,
  'id' | 'createdAt' | 'updatedAt'
>;

export interface IOptionGroupRepositoryWrite {
  createOptionGroup(optionGroup: IOptionGroup): Promise<IOptionGroup>;
  updateOptionGroupById(
    id: string,
    fields: TOptionGroupUpdatableFields,
  ): Promise<IOptionGroup | null>;
  deleteOptionGroupById(id: string): Promise<boolean>;
  setOptionAvailability(
    optionGroupId: string,
    optionId: string,
    isAvailable: boolean,
  ): Promise<IOptionGroup | null>;
}
