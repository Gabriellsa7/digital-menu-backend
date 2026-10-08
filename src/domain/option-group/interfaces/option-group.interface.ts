export interface IOption {
  id: string;
  name: string;
  priceInCents: number;
  isAvailable: boolean;
}

export interface IOptionGroup {
  id: string;
  storeId: string;
  name: string;
  minSelections: number;
  maxSelections: number;
  allowRepeat: boolean;
  options: IOption[];
  createdAt: Date;
  updatedAt: Date;
}
