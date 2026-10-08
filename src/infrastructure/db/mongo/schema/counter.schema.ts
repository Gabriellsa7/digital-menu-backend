import mongoose from 'mongoose';

export interface IMCounter {
  key: string;
  value: number;
}

export const counterSchema = new mongoose.Schema<IMCounter>({
  key: { type: String, required: true, unique: true },
  value: { type: Number, required: true },
});
