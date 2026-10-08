import { IOptionGroup } from '../option-group/interfaces/option-group.interface';
import { IProduct } from '../product/interfaces/product.interface';
import {
  activePromotion,
  discountPercent,
  isNewProduct,
} from '../product/product-pricing';
import { IMenuOptionGroup, IMenuProduct } from './interfaces/menu.interface';

function cheapestRequiredInCents(group: IMenuOptionGroup): number {
  if (group.minSelections === 0) {
    return 0;
  }
  const prices = group.options
    .filter(({ isAvailable }) => isAvailable)
    .map(({ priceInCents }) => priceInCents)
    .sort((a, b) => a - b);
  if (prices.length === 0) {
    return 0;
  }
  if (group.allowRepeat) {
    return prices[0] * group.minSelections;
  }
  return prices
    .slice(0, group.minSelections)
    .reduce((total, price) => total + price, 0);
}

function toMenuOptionGroup(group: IOptionGroup): IMenuOptionGroup {
  return {
    id: group.id,
    name: group.name,
    minSelections: group.minSelections,
    maxSelections: group.maxSelections,
    allowRepeat: group.allowRepeat,
    options: group.options,
  };
}

export function toMenuProduct(
  product: IProduct,
  optionGroupsById: Map<string, IOptionGroup>,
  now: Date,
): IMenuProduct {
  const promotion = activePromotion(product, now);
  const optionGroups = product.optionGroupIds
    .map((id) => optionGroupsById.get(id))
    .filter((group): group is IOptionGroup => group !== undefined)
    .map(toMenuOptionGroup);
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    priceInCents: product.priceInCents,
    fromPriceInCents: optionGroups.reduce(
      (total, group) => total + cheapestRequiredInCents(group),
      promotion?.priceInCents ?? product.priceInCents,
    ),
    ...(promotion && {
      promotion: {
        priceInCents: promotion.priceInCents,
        endsAt: promotion.endsAt,
        discountPercent: discountPercent(product.priceInCents, promotion),
      },
    }),
    isNew: isNewProduct(product, now),
    ...(product.imageUrl && { imageUrl: product.imageUrl }),
    isAvailable: product.isAvailable,
    ...(product.servesPeople !== undefined && {
      servesPeople: product.servesPeople,
    }),
    optionGroups,
  };
}
