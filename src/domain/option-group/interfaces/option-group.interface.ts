export interface IOption {
  id: string;
  name: string;
  priceInCents: number;
  isAvailable: boolean;
}

export interface IOptionGroup {
  id: string;
  name: string;
  /** 0 = optional group; >= 1 = required */
  minSelections: number;
  /** 1 = single choice (radio); > 1 = multiple choice */
  maxSelections: number;
  allowRepeat: boolean;
  options: IOption[];
  createdAt: Date;
  updatedAt: Date;
}
