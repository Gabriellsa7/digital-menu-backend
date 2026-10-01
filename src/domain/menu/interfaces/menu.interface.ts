import { IOptionGroup } from '../../option-group/interfaces/option-group.interface';

// Read model for the public storefront: active categories with their active
// products and option groups inlined, already in display order.

export type IMenuOptionGroup = Omit<IOptionGroup, 'createdAt' | 'updatedAt'>;

export interface IMenuProduct {
  id: string;
  name: string;
  description: string;
  priceInCents: number;
  /** Lowest possible price when required option groups add cost ("a partir de") */
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
