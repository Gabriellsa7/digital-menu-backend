import { randomUUID } from 'crypto';
import { IParamsOptionGroupData } from '../../domain/option-group/interfaces/option-group.service.interface';
import { IParamsProductData } from '../../domain/product/interfaces/product.service.interface';
import { CategoryServiceFactory } from '../../infrastructure/config/factories/category.service.factory';
import { OptionGroupServiceFactory } from '../../infrastructure/config/factories/option-group.service.factory';
import { ProductServiceFactory } from '../../infrastructure/config/factories/product.service.factory';
import { StoreServiceFactory } from '../../infrastructure/config/factories/store.service.factory';
import { Mcategory } from '../../infrastructure/db/mongo/models/category.model';
import { MoptionGroup } from '../../infrastructure/db/mongo/models/option-group.model';
import { Mproduct } from '../../infrastructure/db/mongo/models/product.model';

export async function clearCatalog() {
  await Promise.all([
    Mcategory.deleteMany({}),
    MoptionGroup.deleteMany({}),
    Mproduct.deleteMany({}),
  ]);
}

export async function defaultStoreId(): Promise<string> {
  return (await StoreServiceFactory.create().ensureDefaultStore()).id;
}

export async function createCategory(
  name = `Category ${randomUUID()}`,
  storeId?: string,
) {
  return CategoryServiceFactory.create().createCategory({
    storeId: storeId ?? (await defaultStoreId()),
    name,
  });
}

export async function createOptionGroup(
  overrides: Partial<IParamsOptionGroupData> = {},
) {
  return OptionGroupServiceFactory.create().createOptionGroup({
    storeId: await defaultStoreId(),
    name: 'Adicionais',
    minSelections: 0,
    maxSelections: 2,
    allowRepeat: true,
    options: [
      { name: 'Bacon', priceInCents: 400 },
      { name: 'Cheddar', priceInCents: 300 },
    ],
    ...overrides,
  });
}

export async function createProduct(
  categoryId: string,
  overrides: Partial<IParamsProductData> = {},
) {
  return ProductServiceFactory.create().createProduct({
    storeId: await defaultStoreId(),
    categoryId,
    name: 'Smash burger',
    description: 'Two patties',
    priceInCents: 3000,
    optionGroupIds: [],
    isAvailable: true,
    isActive: true,
    ...overrides,
  });
}
