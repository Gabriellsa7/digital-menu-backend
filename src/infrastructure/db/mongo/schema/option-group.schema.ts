import mongoose, { Types } from 'mongoose';
import {
  IOption,
  IOptionGroup,
} from '../../../../domain/option-group/interfaces/option-group.interface';

export interface IMOptionGroup extends IOptionGroup {
  _id: Types.ObjectId;
}

const optionSchema = new mongoose.Schema<IOption>(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    priceInCents: { type: Number, required: true, min: 0 },
    isAvailable: { type: Boolean, required: true },
  },
  { _id: false },
);

export const optionGroupSchema = new mongoose.Schema<IMOptionGroup>(
  {
    id: { type: String, required: true, unique: true },
    storeId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    minSelections: { type: Number, required: true },
    maxSelections: { type: Number, required: true },
    allowRepeat: { type: Boolean, required: true },
    options: { type: [optionSchema], default: [] },
  },
  { timestamps: true },
);
