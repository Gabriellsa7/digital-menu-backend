import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { randomUUID } from 'crypto';
import { IClock } from '../../common/clock.interface';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { NotFoundError } from '../../errors/not-found.error';
import {
  IOption,
  IOptionGroup,
} from '../interfaces/option-group.interface';
import { IOptionGroupUsage } from '../interfaces/option-group-usage.interface';
import {
  IOptionGroupService,
  IParamsOptionData,
  IParamsOptionGroupData,
  IParamsOptionGroupService,
  IParamsSetOptionAvailability,
  IParamsUpdateOptionGroup,
} from '../interfaces/option-group.service.interface';
import { OptionGroup } from '../option-group.entity';
import { IOptionGroupRepositoryRead } from '../repository/option-group.repository.read';
import { IOptionGroupRepositoryWrite } from '../repository/option-group.repository.write';

export class OptionGroupService implements IOptionGroupService {
  private optionGroupRepositoryRead: IOptionGroupRepositoryRead;
  private optionGroupRepositoryWrite: IOptionGroupRepositoryWrite;
  private optionGroupUsage: IOptionGroupUsage;
  private clock: IClock;

  constructor({
    optionGroupRepositoryRead,
    optionGroupRepositoryWrite,
    optionGroupUsage,
    clock,
  }: IParamsOptionGroupService) {
    this.optionGroupRepositoryRead = optionGroupRepositoryRead;
    this.optionGroupRepositoryWrite = optionGroupRepositoryWrite;
    this.optionGroupUsage = optionGroupUsage;
    this.clock = clock;
  }

  @ErrorHandler()
  async listOptionGroups(): Promise<IOptionGroup[]> {
    return this.optionGroupRepositoryRead.listOptionGroups();
  }

  @ErrorHandler()
  async getOptionGroupById(id: string): Promise<IOptionGroup> {
    const optionGroup =
      await this.optionGroupRepositoryRead.findOptionGroupById(id);

    return optionGroup ? optionGroup : this.throwOptionGroupNotFound();
  }

  @ErrorHandler()
  async findOptionGroupsByIds(ids: string[]): Promise<IOptionGroup[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.optionGroupRepositoryRead.findOptionGroupsByIds(ids);
  }

  @ErrorHandler()
  async createOptionGroup(
    params: IParamsOptionGroupData,
  ): Promise<IOptionGroup> {
    const now = this.clock.now();
    const optionGroup = new OptionGroup({
      ...params,
      id: randomUUID(),
      options: this.buildOptions(params.options, []),
      createdAt: now,
      updatedAt: now,
    });

    return this.optionGroupRepositoryWrite.createOptionGroup(optionGroup);
  }

  @ErrorHandler()
  async updateOptionGroup({
    id,
    ...params
  }: IParamsUpdateOptionGroup): Promise<IOptionGroup> {
    const current = await this.getOptionGroupById(id);
    const { createdAt, updatedAt, ...fields } = new OptionGroup({
      ...current,
      ...params,
      options: this.buildOptions(params.options, current.options),
    });

    const updated = await this.optionGroupRepositoryWrite.updateOptionGroupById(
      id,
      { ...fields },
    );
    return updated ? updated : this.throwOptionGroupNotFound();
  }

  @ErrorHandler()
  async deleteOptionGroup(id: string): Promise<void> {
    await this.getOptionGroupById(id);
    const productCount =
      await this.optionGroupUsage.countProductsUsingOptionGroup(id);
    if (productCount > 0) {
      throw new BusinessRuleError(
        'An option group linked to products cannot be deleted',
        'OPTION_GROUP_IN_USE',
        { productCount },
      );
    }
    await this.optionGroupRepositoryWrite.deleteOptionGroupById(id);
  }

  @ErrorHandler()
  async setOptionAvailability({
    optionGroupId,
    optionId,
    isAvailable,
  }: IParamsSetOptionAvailability): Promise<IOptionGroup> {
    new OptionGroup(await this.getOptionGroupById(optionGroupId)).findOption(
      optionId,
    );

    const updated = await this.optionGroupRepositoryWrite.setOptionAvailability(
      optionGroupId,
      optionId,
      isAvailable,
    );
    return updated ? updated : this.throwOptionGroupNotFound();
  }

  private buildOptions(
    options: IParamsOptionData[],
    currentOptions: IOption[],
  ): IOption[] {
    const currentIds = new Set(currentOptions.map(({ id }) => id));
    return options.map((option) => ({
      id: option.id && currentIds.has(option.id) ? option.id : randomUUID(),
      name: option.name,
      priceInCents: option.priceInCents,
      isAvailable: option.isAvailable ?? true,
    }));
  }

  private throwOptionGroupNotFound(): never {
    throw new NotFoundError('Option group not found');
  }
}
