import { MenuService } from '../../domain/menu/service/menu.service';
import { ICategoryService } from '../../domain/category/interfaces/category.service.interface';
import { IProductService } from '../../domain/product/interfaces/product.service.interface';
import { IOptionGroupService } from '../../domain/option-group/interfaces/option-group.service.interface';
import { ICategory } from '../../domain/category/interfaces/category.interface';
import { IProduct } from '../../domain/product/interfaces/product.interface';
import { IOptionGroup } from '../../domain/option-group/interfaces/option-group.interface';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { IStoreService } from '../../domain/store/interfaces/store.service.interface';

const NOW = new Date('2026-10-01T12:00:00Z');

function aCategory(id: string, overrides: Partial<ICategory> = {}): ICategory {
  return {
    id,
    storeId: 'store-1',
    name: id,
    position: 0,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function aProduct(id: string, overrides: Partial<IProduct> = {}): IProduct {
  return {
    id,
    storeId: 'store-1',
    isFeatured: false,
    categoryId: 'burgers',
    name: id,
    description: '',
    priceInCents: 3000,
    optionGroupIds: [],
    isAvailable: true,
    isActive: true,
    position: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function aGroup(id: string, overrides: Partial<IOptionGroup> = {}): IOptionGroup {
  return {
    id,
    storeId: 'store-1',
    name: id,
    minSelections: 0,
    maxSelections: 2,
    allowRepeat: false,
    options: [
      { id: 'a', name: 'A', priceInCents: 500, isAvailable: true },
      { id: 'b', name: 'B', priceInCents: 200, isAvailable: true },
      { id: 'c', name: 'C', priceInCents: 100, isAvailable: false },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

let categoryService: jest.Mocked<
  Pick<ICategoryService, 'listCategories' | 'getCategoryById'>
>;
let productService: jest.Mocked<
  Pick<IProductService, 'listActiveProducts' | 'getProductById'>
>;
let optionGroupService: jest.Mocked<
  Pick<IOptionGroupService, 'findOptionGroupsByIds'>
>;
let menuService: MenuService;

beforeEach(() => {
  categoryService = {
    listCategories: jest
      .fn()
      .mockResolvedValue([
        aCategory('burgers'),
        aCategory('hidden', { isActive: false }),
        aCategory('empty'),
      ]),
    getCategoryById: jest.fn().mockResolvedValue(aCategory('burgers')),
  };
  productService = {
    listActiveProducts: jest.fn().mockResolvedValue([]),
    getProductById: jest.fn().mockResolvedValue(aProduct('smash')),
  };
  optionGroupService = { findOptionGroupsByIds: jest.fn().mockResolvedValue([]) };
  menuService = new MenuService({
    storeService: {
      getPublishedStoreBySlug: jest
        .fn()
        .mockResolvedValue({ store: { id: 'store-1' } }),
    } as unknown as IStoreService,
    categoryService: categoryService as unknown as ICategoryService,
    productService: productService as unknown as IProductService,
    optionGroupService: optionGroupService as unknown as IOptionGroupService,
  });
});

describe('When we build the public menu (PRD-R05)', () => {
  it('should hide inactive and empty categories and keep sold-out products', async () => {
    productService.listActiveProducts.mockResolvedValue([
      aProduct('smash', { isAvailable: false }),
      aProduct('secret', { categoryId: 'hidden' }),
    ]);

    const menu = await menuService.getMenu('casa-brasa');

    expect(categoryService.listCategories).toHaveBeenCalledWith('store-1');
    expect(productService.listActiveProducts).toHaveBeenCalledWith('store-1');
    expect(menu.categories).toHaveLength(1);
    expect(menu.categories[0]).toMatchObject({
      id: 'burgers',
      products: [{ id: 'smash', isAvailable: false }],
    });
  });

  it('should inline option groups in the product order', async () => {
    productService.listActiveProducts.mockResolvedValue([
      aProduct('smash', { optionGroupIds: ['sauce', 'bread'] }),
    ]);
    optionGroupService.findOptionGroupsByIds.mockResolvedValue([
      aGroup('bread'),
      aGroup('sauce'),
    ]);

    const menu = await menuService.getMenu('casa-brasa');

    expect(
      menu.categories[0].products[0].optionGroups.map(({ id }) => id),
    ).toEqual(['sauce', 'bread']);
  });
});

describe('When we compute the "a partir de" price', () => {
  it.each([
    ['without required groups', aGroup('g'), 3000],
    [
      'with two required picks without repeat',
      aGroup('g', { minSelections: 2 }),
      3700,
    ],
    [
      'with two required picks with repeat',
      aGroup('g', { minSelections: 2, allowRepeat: true }),
      3400,
    ],
  ])('should price a product %s', async (_case, group, expected) => {
    productService.getProductById.mockResolvedValue(
      aProduct('smash', { optionGroupIds: ['g'] }),
    );
    optionGroupService.findOptionGroupsByIds.mockResolvedValue([group]);

    const product = await menuService.getMenuProduct('casa-brasa', 'smash');

    expect(product.fromPriceInCents).toBe(expected);
  });
});

describe('When we read a single menu product', () => {
  it.each([
    ['an inactive product', aProduct('smash', { isActive: false }), true],
    ['a product of an inactive category', aProduct('smash'), false],
  ])('should hide %s', async (_case, product, isCategoryActive) => {
    productService.getProductById.mockResolvedValue(product);
    categoryService.getCategoryById.mockResolvedValue(
      aCategory('burgers', { isActive: isCategoryActive }),
    );

    await expect(
      menuService.getMenuProduct('casa-brasa', 'smash'),
    ).rejects.toThrow(NotFoundError);
  });
});
