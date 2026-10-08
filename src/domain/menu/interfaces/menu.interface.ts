import { IOptionGroup } from '../../option-group/interfaces/option-group.interface';

export type IMenuOptionGroup = Omit<
  IOptionGroup,
  'storeId' | 'createdAt' | 'updatedAt'
>;

export interface IMenuPromotion {
  priceInCents: number;
  endsAt: Date;
  discountPercent: number;
}

export interface IMenuProduct {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  fromPriceInCents: number;
  imageUrl?: string;
  isAvailable: boolean;
  servesPeople?: number;
  promotion?: IMenuPromotion;
  isNew: boolean;
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
