import { BusinessRuleError } from '../errors/business-rule.error';
import { NotFoundError } from '../errors/not-found.error';
import { IOption, IOptionGroup } from './interfaces/option-group.interface';

export class OptionGroup implements IOptionGroup {
  public readonly id: string;
  public readonly storeId: string;
  public readonly name: string;
  public readonly minSelections: number;
  public readonly maxSelections: number;
  public readonly allowRepeat: boolean;
  public readonly options: IOption[];
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: IOptionGroup) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.name = props.name.trim();
    this.minSelections = props.minSelections;
    this.maxSelections = props.maxSelections;
    this.allowRepeat = props.allowRepeat;
    this.options = props.options.map((option) => ({
      ...option,
      name: option.name.trim(),
    }));
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.assertInvariants();
  }

  findOption(optionId: string): IOption {
    const option = this.options.find(({ id }) => id === optionId);
    if (!option) {
      throw new NotFoundError('Option not found');
    }
    return option;
  }

  isRequired(): boolean {
    return this.minSelections > 0;
  }

  private assertInvariants(): void {
    if (
      this.minSelections < 0 ||
      this.maxSelections < 1 ||
      this.minSelections > this.maxSelections
    ) {
      throw new BusinessRuleError(
        'Selections must satisfy 0 <= min <= max and max >= 1',
        'INVALID_SELECTION_RANGE',
      );
    }
    if (this.options.length === 0) {
      throw new BusinessRuleError(
        'An option group needs at least one option',
        'OPTION_GROUP_EMPTY',
      );
    }
    if (!this.allowRepeat && this.maxSelections > this.options.length) {
      throw new BusinessRuleError(
        'Without repeats, the maximum cannot exceed the number of options',
        'MAX_SELECTIONS_ABOVE_OPTIONS',
      );
    }
    const names = this.options.map(({ name }) => name.toLowerCase());
    if (new Set(names).size !== names.length) {
      throw new BusinessRuleError(
        'Option names must be unique within the group',
        'DUPLICATED_OPTION_NAME',
      );
    }
  }
}
