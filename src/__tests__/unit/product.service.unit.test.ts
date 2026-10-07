import { ProductService } from '../../domain/product/service/product.service';
import { IProductRepositoryRead } from '../../domain/product/repository/product.repository.read';
import { IProductRepositoryWrite } from '../../domain/product/repository/product.repository.write';
import { IProduct } from '../../domain/product/interfaces/product.interface';
import { ICategoryService } from '../../domain/category/interfaces/category.service.interface';
import { IOptionGroupService } from '../../domain/option-group/interfaces/option-group.service.interface';
import { IOptionGroup } from '../../domain/option-group/interfaces/option-group.interface';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { FixedClock } from '../helpers/fixed.clock';

const clock = new FixedClock();
const PRODUCT_DATA = {
  categoryId: 'burgers',
  name: 'Smash',
  description: 'Two patties',
  priceInCents: 3290,
  optionGroupIds: ['extras'],
  isAvailable: true,
  isActive: true,
};

function aProduct(overrides: Partial<IProduct> = {}): IProduct {
  return {
    ...PRODUCT_DATA,
    id: 'product-1',
    position: 0,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

function aGroup(id: string, minSelections = 0): IOptionGroup {
  return {
    id,
    name: id,
    minSelections,
    maxSelections: 1,
    allowRepeat: false,
    options: [{ id: 'o', name: 'o', priceInCents: 0, isAvailable: true }],
    createdAt: clock.now(),
    updatedAt: clock.now(),
  };
}

let productRepositoryRead: jest.Mocked<IProductRepositoryRead>;
let productRepositoryWrite: jest.Mocked<IProductRepositoryWrite>;
let categoryService: jest.Mocked<Pick<ICategoryService, 'getCategoryById'>>;
let optionGroupService: jest.Mocked<
  Pick<IOptionGroupService, 'findOptionGroupsByIds'>
>;
let productService: ProductService;

beforeEach(() => {
  productRepositoryRead = {
    findProductById: jest.fn().mockResolvedValue(aProduct()),
    findProductsByIds: jest.fn().mockResolvedValue([]),
    listProducts: jest.fn(),
    listProductsInCategory: jest.fn().mockResolvedValue([]),
    listActiveProducts: jest.fn(),
    findMaxPositionInCategory: jest.fn().mockResolvedValue(-1),
  };
  productRepositoryWrite = {
    createProduct: jest.fn(async (product) => ({ ...product })),
    updateProductById: jest.fn(async (id, { set = {} }) => ({
      ...aProduct({ id }),
      ...set,
    })),
    deleteProductById: jest.fn().mockResolvedValue(true),
    reorderProductsInCategory: jest.fn(),
  };
  categoryService = { getCategoryById: jest.fn() };
  optionGroupService = {
    findOptionGroupsByIds: jest.fn(async (ids: string[]) =>
      ids.map((id) => aGroup(id)),
    ),
  };
  productService = new ProductService({
    productRepositoryRead,
    productRepositoryWrite,
    categoryService: categoryService as unknown as ICategoryService,
    optionGroupService: optionGroupService as unknown as IOptionGroupService,
    clock,
  });
});

describe('When we create a product', () => {
  it('should append it to the end of its category', async () => {
    productRepositoryRead.findMaxPositionInCategory.mockResolvedValue(4);

    const product = await productService.createProduct(PRODUCT_DATA);

    expect(product).toMatchObject({ name: 'Smash', position: 5 });
  });

  it('should throw NotFoundError for an unknown category (PRD-R02)', async () => {
    categoryService.getCategoryById.mockRejectedValue(
      new NotFoundError('Category not found'),
    );

    await expect(productService.createProduct(PRODUCT_DATA)).rejects.toThrow(
      'Category not found',
    );
  });

  it('should throw NotFoundError for an unknown option group (PRD-R02)', async () => {
    optionGroupService.findOptionGroupsByIds.mockResolvedValue([]);

    await expect(productService.createProduct(PRODUCT_DATA)).rejects.toThrow(
      'Option group not found: extras',
    );
  });

  it('should reject a free product without a required group (PRD-R01)', async () => {
    await expect(
      productService.createProduct({ ...PRODUCT_DATA, priceInCents: 0 }),
    ).rejects.toMatchObject({ code: 'FREE_PRODUCT_NEEDS_REQUIRED_OPTIONS' });
  });

  it('should accept a free product with a required group (PRD-R01)', async () => {
    optionGroupService.findOptionGroupsByIds.mockResolvedValue([
      aGroup('extras', 1),
    ]);

    await expect(
      productService.createProduct({ ...PRODUCT_DATA, priceInCents: 0 }),
    ).resolves.toMatchObject({ priceInCents: 0 });
  });
});

describe('When we update a product', () => {
  it('should keep the position inside the same category', async () => {
    productRepositoryRead.findProductById.mockResolvedValue(
      aProduct({ position: 3 }),
    );

    const product = await productService.updateProduct({
      ...PRODUCT_DATA,
      id: 'product-1',
      name: 'Double smash',
      servesPeople: 2,
    });

    expect(product).toMatchObject({
      name: 'Double smash',
      position: 3,
      servesPeople: 2,
    });
  });

  it('should move it to the end of a new category', async () => {
    productRepositoryRead.findMaxPositionInCategory.mockResolvedValue(1);

    const product = await productService.updateProduct({
      ...PRODUCT_DATA,
      id: 'product-1',
      categoryId: 'combos',
    });

    expect(product.position).toBe(2);
    expect(productRepositoryWrite.updateProductById).toHaveBeenCalledWith(
      'product-1',
      expect.objectContaining({ unset: ['servesPeople'] }),
    );
  });

  it('should throw NotFoundError for an unknown product', async () => {
    productRepositoryRead.findProductById.mockResolvedValue(null);

    await expect(
      productService.updateProduct({ ...PRODUCT_DATA, id: 'missing' }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('When we change the availability or delete a product', () => {
  it('should mark the product as sold out', async () => {
    const product = await productService.setProductAvailability({
      id: 'product-1',
      isAvailable: false,
    });

    expect(product.isAvailable).toBe(false);
  });

  it('should throw NotFoundError when deleting an unknown product', async () => {
    productRepositoryWrite.deleteProductById.mockResolvedValue(false);

    await expect(productService.deleteProduct('missing')).rejects.toThrow(
      NotFoundError,
    );
  });
});

describe('When we reorder products in a category', () => {
  it('should require every product of the category', async () => {
    productRepositoryRead.listProductsInCategory.mockResolvedValue([
      aProduct({ id: 'a' }),
      aProduct({ id: 'b' }),
    ]);

    await expect(
      productService.reorderProductsInCategory('burgers', ['b']),
    ).rejects.toMatchObject({ code: 'INVALID_ORDER' });
    await productService.reorderProductsInCategory('burgers', ['b', 'a']);
    expect(
      productRepositoryWrite.reorderProductsInCategory,
    ).toHaveBeenCalledWith('burgers', ['b', 'a']);
  });
});
