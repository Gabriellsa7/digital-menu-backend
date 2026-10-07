import { IOptionGroup } from '../../../domain/option-group/interfaces/option-group.interface';
import { IOptionGroupRepositoryRead } from '../../../domain/option-group/repository/option-group.repository.read';
import { MoptionGroup } from '../../db/mongo/models/option-group.model';
import { HIDE_MONGO_INTERNAL_FIELDS } from '../../db/mongo/mongo.projection';

export class OptionGroupRepositoryRead implements IOptionGroupRepositoryRead {
  async findOptionGroupById(id: string): Promise<IOptionGroup | null> {
    return MoptionGroup.findOne(
      { id },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IOptionGroup>();
  }

  async findOptionGroupsByIds(ids: string[]): Promise<IOptionGroup[]> {
    return MoptionGroup.find(
      { id: { $in: ids } },
      HIDE_MONGO_INTERNAL_FIELDS,
    ).lean<IOptionGroup[]>();
  }

  async listOptionGroups(): Promise<IOptionGroup[]> {
    return MoptionGroup.find({}, HIDE_MONGO_INTERNAL_FIELDS)
      .sort({ name: 1 })
      .lean<IOptionGroup[]>();
  }
}
