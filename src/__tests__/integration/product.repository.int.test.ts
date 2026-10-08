import { randomUUID } from 'crypto';
import { IProduct } from '../../domain/product/interfaces/product.interface';
import { Mproduct } from '../../infrastructure/db/mongo/models/product.model';
import { ProductRepositoryRead } from '../../infrastructure/repository/product/product.repository.read';
import { ProductRepositoryWrite } from '../../infrastructure/repository/product/product.repository.write';
import { ProductUsage } from '../../infrastructure/repository/product/product.usage';

const productRepositoryRead = new ProductRepositoryRead();
const productRepositoryWrite = new ProductRepositoryWrite();
const productUsage = new ProductUsage();

function createProduct(overrides: Partial<IProduct> = {}) {
  const now = new Date();
  return productRepositoryWrite.createProduct({
    id: randomUUID(),
    storeId: 'store-1',
    isFeatured: false,
    categoryId: 'burgers',
    name: 'Smash',
    description: '',
    priceInCents: 3000,
    optionGroupIds: [],
    isAvailable: true,
    isActive: true,
    position: 0,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });
}

beforeEach(async () => {
  await Mproduct.deleteMany({});
});

describe('When we list products', () => {
  it('should filter by category and search, with pagination', async () => {
    await createProduct({ name: 'Smash (duplo)', position: 1 });
    await createProduct({ name: 'Smash salada', position: 0 });
    await createProduct({ name: 'Cheddar burger', position: 2 });
    await createProduct({ name: 'Smash kids', categoryId: 'kids' });

    const { items, total } = await productRepositoryRead.listProducts({
      storeId: 'store-1',
      categoryId: 'burgers',
      search: 'smash (',
      limit: 10,
      offset: 0,
    });
    const page = await productRepositoryRead.listProducts({
      storeId: 'store-1',
      categoryId: 'burgers',
      limit: 1,
      offset: 1,
    });

    expect(total).toBe(1);
    expect(items[0].name).toBe('Smash (duplo)');
    expect(page.total).toBe(3);
    expect(page.items[0].name).toBe('Smash (duplo)');
  });
});

describe('When we check whether categories and option groups are used', () => {
  it('should count products per category and per option group (CAT-R02, OPT-R04)', async () => {
    await createProduct({ optionGroupIds: ['extras', 'bread'] });
    await createProduct({ optionGroupIds: ['bread'] });

    await expect(
      productUsage.countProductsInCategory('burgers'),
    ).resolves.toBe(2);
    await expect(
      productUsage.countProductsUsingOptionGroup('extras'),
    ).resolves.toBe(1);
    await expect(
      productUsage.countProductsUsingOptionGroup('drinks'),
    ).resolves.toBe(0);
  });
});
