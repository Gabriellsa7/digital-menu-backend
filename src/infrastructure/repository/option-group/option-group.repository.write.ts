import { IOptionGroup } from '../../../domain/option-group/interfaces/option-group.interface';
import {
  IOptionGroupRepositoryWrite,
  TOptionGroupUpdatableFields,
} from '../../../domain/option-group/repository/option-group.repository.write';
import { MoptionGroup } from '../../db/mongo/models/option-group.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class OptionGroupRepositoryWrite implements IOptionGroupRepositoryWrite {
  async createOptionGroup(optionGroup: IOptionGroup): Promise<IOptionGroup> {
    const created = await MoptionGroup.create({ ...optionGroup });
    const { _id, __v, ...createdOptionGroup } = created.toObject();
    return createdOptionGroup;
  }

  async updateOptionGroupById(
    id: string,
    fields: TOptionGroupUpdatableFields,
  ): Promise<IOptionGroup | null> {
    return MoptionGroup.findOneAndUpdate(
      { id },
      { $set: fields },
      { new: true, projection: HIDE_MONGO_INTERNAL_FIELDS },
    ).lean<IOptionGroup>();
  }

  async deleteOptionGroupById(id: string): Promise<boolean> {
    const { deletedCount } = await MoptionGroup.deleteOne({ id });
    return deletedCount === 1;
  }

  async setOptionAvailability(
    optionGroupId: string,
    optionId: string,
    isAvailable: boolean,
  ): Promise<IOptionGroup | null> {
    return MoptionGroup.findOneAndUpdate(
      { id: optionGroupId, 'options.id': optionId },
      { $set: { 'options.$.isAvailable': isAvailable } },
      { new: true, projection: HIDE_MONGO_INTERNAL_FIELDS },
    ).lean<IOptionGroup>();
  }
}
