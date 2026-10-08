import { CategoryService } from '../../domain/category/service/category.service';
import { ICategoryRepositoryRead } from '../../domain/category/repository/category.repository.read';
import { ICategoryRepositoryWrite } from '../../domain/category/repository/category.repository.write';
import { ICategoryUsage } from '../../domain/category/interfaces/category-usage.interface';
import { ICategory } from '../../domain/category/interfaces/category.interface';
import { ConflictError } from '../../domain/errors/conflict.error';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { FixedClock } from '../helpers/fixed.clock';

const clock = new FixedClock();
const STORE_ID = 'store-1';

function aCategory(overrides: Partial<ICategory> = {}): ICategory {
  return {
    id: 'category-1',
    storeId: STORE_ID,
    name: 'Burgers',
    position: 0,
    isActive: true,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

let categoryRepositoryRead: jest.Mocked<ICategoryRepositoryRead>;
let categoryRepositoryWrite: jest.Mocked<ICategoryRepositoryWrite>;
let categoryUsage: jest.Mocked<ICategoryUsage>;
let categoryService: CategoryService;

beforeEach(() => {
  categoryRepositoryRead = {
    findCategoryById: jest.fn().mockResolvedValue(aCategory()),
    findCategoryByName: jest.fn().mockResolvedValue(null),
    listCategories: jest.fn().mockResolvedValue([]),
    findMaxCategoryPosition: jest.fn().mockResolvedValue(-1),
  };
  categoryRepositoryWrite = {
    createCategory: jest.fn(async (category) => ({ ...category })),
    updateCategoryById: jest.fn(async (id, fields) => ({
      ...aCategory({ id }),
      ...fields,
    })),
    deleteCategoryById: jest.fn().mockResolvedValue(true),
    reorderCategories: jest.fn(),
  };
  categoryUsage = { countProductsInCategory: jest.fn().mockResolvedValue(0) };
  categoryService = new CategoryService({
    categoryRepositoryRead,
    categoryRepositoryWrite,
    categoryUsage,
    clock,
  });
});

describe('When we create a category', () => {
  it('should append it after the last position', async () => {
    categoryRepositoryRead.findMaxCategoryPosition.mockResolvedValue(3);

    const category = await categoryService.createCategory({
      storeId: STORE_ID,
      name: ' Drinks ',
    });

    expect(category).toMatchObject({
      name: 'Drinks',
      position: 4,
      isActive: true,
    });
  });

  it('should start at position 0 when there are no categories', async () => {
    const category = await categoryService.createCategory({
      storeId: STORE_ID,
      name: 'Drinks',
    });

    expect(category.position).toBe(0);
  });

  it('should reject a name already in use in the store, ignoring casing (CAT-R01)', async () => {
    categoryRepositoryRead.findCategoryByName.mockResolvedValue(aCategory());

    await expect(
      categoryService.createCategory({ storeId: STORE_ID, name: 'BURGERS' }),
    ).rejects.toThrow(ConflictError);
    expect(categoryRepositoryRead.findCategoryByName).toHaveBeenCalledWith(
      STORE_ID,
      'BURGERS',
    );
  });
});

describe('When we update a category', () => {
  it('should allow keeping its own name', async () => {
    categoryRepositoryRead.findCategoryByName.mockResolvedValue(aCategory());

    const category = await categoryService.updateCategory({
      storeId: STORE_ID,
      id: 'category-1',
      name: 'burgers',
      isActive: false,
    });

    expect(category).toMatchObject({ name: 'burgers', isActive: false });
  });

  it('should reject the name of another category (CAT-R01)', async () => {
    categoryRepositoryRead.findCategoryByName.mockResolvedValue(
      aCategory({ id: 'category-2' }),
    );

    await expect(
      categoryService.updateCategory({
        storeId: STORE_ID,
        id: 'category-1',
        name: 'Burgers',
      }),
    ).rejects.toMatchObject({ code: 'CATEGORY_NAME_IN_USE' });
  });

  it('should treat a category of another store as not found (TEN-R04)', async () => {
    categoryRepositoryRead.findCategoryById.mockResolvedValue(
      aCategory({ storeId: 'store-2' }),
    );

    await expect(
      categoryService.updateCategory({
        storeId: STORE_ID,
        id: 'category-1',
        isActive: false,
      }),
    ).rejects.toThrow(NotFoundError);
    expect(categoryRepositoryWrite.updateCategoryById).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError for an unknown category', async () => {
    categoryRepositoryRead.findCategoryById.mockResolvedValue(null);

    await expect(
      categoryService.updateCategory({
        storeId: STORE_ID,
        id: 'missing',
        isActive: false,
      }),
    ).rejects.toThrow(NotFoundError);
  });
});

describe('When we delete a category', () => {
  it('should delete an empty category', async () => {
    await categoryService.deleteCategory(STORE_ID, 'category-1');

    expect(categoryRepositoryWrite.deleteCategoryById).toHaveBeenCalledWith(
      'category-1',
    );
  });

  it('should block a category that still has products (CAT-R02)', async () => {
    categoryUsage.countProductsInCategory.mockResolvedValue(2);

    await expect(
      categoryService.deleteCategory(STORE_ID, 'category-1'),
    ).rejects.toMatchObject({
      code: 'CATEGORY_NOT_EMPTY',
      details: { productCount: 2 },
    });
    expect(categoryRepositoryWrite.deleteCategoryById).not.toHaveBeenCalled();
  });
});

describe('When we reorder the categories (CAT-R03)', () => {
  beforeEach(() => {
    categoryRepositoryRead.listCategories.mockResolvedValue([
      aCategory({ id: 'a' }),
      aCategory({ id: 'b' }),
      aCategory({ id: 'c' }),
    ]);
  });

  it('should rewrite the positions from the full ordered list', async () => {
    await categoryService.reorderCategories(STORE_ID, ['c', 'a', 'b']);

    expect(categoryRepositoryWrite.reorderCategories).toHaveBeenCalledWith([
      'c',
      'a',
      'b',
    ]);
  });

  it.each([
    ['a missing id', ['c', 'a']],
    ['a duplicated id', ['c', 'a', 'a']],
    ['an unknown id', ['c', 'a', 'x']],
  ])('should reject a list with %s', async (_case, ids) => {
    await expect(
      categoryService.reorderCategories(STORE_ID, ids),
    ).rejects.toMatchObject({ code: 'INVALID_ORDER' });
  });
});
