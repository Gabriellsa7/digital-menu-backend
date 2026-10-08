import { IOptionGroup } from '../../option-group/interfaces/option-group.interface';

export type IMenuOptionGroup = Omit<
  IOptionGroup,
  'storeId' | 'createdAt' | 'updatedAt'
>;

export interface IMenuProduct {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  fromPriceInCents: number;
  imageUrl?: string;
  isAvailable: boolean;
  servesPeople?: number;
  optionGroups: IMenuOptionGroup[];
}

export interface IMenuCategory {
  id: string;
  name: string;
  products: IMenuProduct[];
}

export interface IMenu {
  categories: IMenuCategory[];
}
