import { BusinessRuleError } from '../errors/business-rule.error';
import { IOptionGroup } from '../option-group/interfaces/option-group.interface';
import { effectivePriceInCents } from '../product/product-pricing';
import { IProduct } from '../product/interfaces/product.interface';
import {
  ICartItem,
  ICartItemOption,
} from './interfaces/order-pricing.service.interface';
import { IOrderItem, IOrderItemOption } from './interfaces/order.interface';

export const MAX_ORDER_LINES = 50;
export const MAX_ITEM_QUANTITY = 99;

function invalidOptions(productId: string, reason: string): never {
  throw new BusinessRuleError(reason, 'INVALID_OPTIONS', { productId });
}

function buildGroupSelection(
  productId: string,
  group: IOptionGroup,
  selections: ICartItemOption[],
): IOrderItemOption[] {
  const picked = selections.map((selection) => {
    const option = group.options.find(({ id }) => id === selection.optionId);
    if (!option || !option.isAvailable) {
      invalidOptions(productId, `Option is not available in "${group.name}"`);
    }
    const quantity = selection.quantity ?? 1;
    if (!Number.isInteger(quantity) || quantity < 1) {
      invalidOptions(productId, 'Option quantity must be at least 1');
    }
    return {
      groupId: group.id,
      groupName: group.name,
      optionId: option.id,
      name: option.name,
      priceInCents: option.priceInCents,
      quantity,
    };
  });

  const optionIds = picked.map(({ optionId }) => optionId);
  const hasRepeats =
    new Set(optionIds).size !== optionIds.length ||
    picked.some(({ quantity }) => quantity > 1);
  if (hasRepeats && !group.allowRepeat) {
    invalidOptions(productId, `"${group.name}" does not allow repeats`);
  }
  const count = picked.reduce((total, { quantity }) => total + quantity, 0);
  if (count < group.minSelections || count > group.maxSelections) {
    invalidOptions(
      productId,
      `"${group.name}" needs between ${group.minSelections} and ${group.maxSelections} selections`,
    );
  }
  return picked;
}

function buildOrderItem(
  item: ICartItem,
  product: IProduct | undefined,
  groupsById: Map<string, IOptionGroup>,
  now: Date,
): IOrderItem {
  if (!product || !product.isActive || !product.isAvailable) {
    throw new BusinessRuleError(
      'Product is not available',
      'PRODUCT_UNAVAILABLE',
      { productId: item.productId },
    );
  }
  const unknownGroup = item.options.find(
    ({ groupId }) => !product.optionGroupIds.includes(groupId),
  );
  if (unknownGroup) {
    invalidOptions(product.id, 'Option group does not belong to the product');
  }
  const options = product.optionGroupIds.flatMap((groupId) => {
    const group = groupsById.get(groupId);
    return group
      ? buildGroupSelection(
          product.id,
          group,
          item.options.filter((selection) => selection.groupId === groupId),
        )
      : [];
  });
  const basePriceInCents = effectivePriceInCents(product, now);
  const unitPriceInCents = options.reduce(
    (total, option) => total + option.priceInCents * option.quantity,
    basePriceInCents,
  );
  return {
    productId: product.id,
    name: product.name,
    ...(product.imageUrl && { imageUrl: product.imageUrl }),
    ...(basePriceInCents !== product.priceInCents && {
      listPriceInCents: product.priceInCents,
    }),
    unitPriceInCents,
    quantity: item.quantity,
    options,
    ...(item.notes?.trim() && { notes: item.notes.trim() }),
    totalInCents: unitPriceInCents * item.quantity,
  };
}

export function assertCartSize(items: ICartItem[]): void {
  if (items.length === 0 || items.length > MAX_ORDER_LINES) {
    throw new BusinessRuleError(
      `An order needs between 1 and ${MAX_ORDER_LINES} lines`,
      'INVALID_CART_SIZE',
    );
  }
  const invalid = items.find(
    ({ quantity }) =>
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_ITEM_QUANTITY,
  );
  if (invalid) {
    throw new BusinessRuleError(
      `Item quantity must be between 1 and ${MAX_ITEM_QUANTITY}`,
      'INVALID_QUANTITY',
      { productId: invalid.productId },
    );
  }
}

export function buildOrderItems(
  items: ICartItem[],
  products: IProduct[],
  optionGroups: IOptionGroup[],
  now: Date,
): IOrderItem[] {
  const productsById = new Map(products.map((product) => [product.id, product]));
  const groupsById = new Map(optionGroups.map((group) => [group.id, group]));
  return items.map((item) =>
    buildOrderItem(item, productsById.get(item.productId), groupsById, now),
  );
}
