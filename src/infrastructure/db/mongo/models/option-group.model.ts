import mongoose from 'mongoose';
import {
  IMOptionGroup,
  optionGroupSchema,
} from '../schema/option-group.schema';

export const MoptionGroup = mongoose.model<IMOptionGroup>(
  'optionGroup',
  optionGroupSchema,
);
