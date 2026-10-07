import {
  IOption,
  IOptionGroup,
} from '../../../domain/option-group/interfaces/option-group.interface';

export interface IOptionGroupResponse {
  id: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  allowRepeat: boolean;
  options: IOption[];
}

export function toOptionResponse(option: IOption): IOption {
  return {
    id: option.id,
    name: option.name,
    priceInCents: option.priceInCents,
    isAvailable: option.isAvailable,
  };
}

export function toOptionGroupResponse(
  optionGroup: Omit<IOptionGroup, 'createdAt' | 'updatedAt'>,
): IOptionGroupResponse {
  return {
    id: optionGroup.id,
    name: optionGroup.name,
    minSelections: optionGroup.minSelections,
    maxSelections: optionGroup.maxSelections,
    allowRepeat: optionGroup.allowRepeat,
    options: optionGroup.options.map(toOptionResponse),
  };
}
