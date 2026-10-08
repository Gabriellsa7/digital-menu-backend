import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { CategoryServiceFactory } from '../../infrastructure/config/factories/category.service.factory';
import {
  clearCatalog,
  createCategory,
  createOptionGroup,
  createProduct,
} from '../helpers/catalog.helper';

beforeEach(async () => {
  await clearCatalog();
});

describe('When a visitor opens the menu', () => {
  it('should return active categories with their products in order', async () => {
    const burgers = await createCategory('Burgers');
    const drinks = await createCategory('Bebidas');
    const hidden = await createCategory('Secret');
    await CategoryServiceFactory.create().updateCategory({
      id: hidden.id,
      isActive: false,
    });
    const bread = await createOptionGroup({
      name: 'Pão',
      minSelections: 1,
      maxSelections: 1,
      allowRepeat: false,
      options: [
        { name: 'Brioche', priceInCents: 200 },
        { name: 'Australiano', priceInCents: 0 },
      ],
    });
    await createProduct(burgers.id, {
      name: 'Smash',
      optionGroupIds: [bread.id],
    });
    await createProduct(burgers.id, { name: 'Salada', isAvailable: false });
    await createProduct(burgers.id, { name: 'Old', isActive: false });
    await createProduct(drinks.id, { name: 'Coca', priceInCents: 700 });
    await createProduct(hidden.id, { name: 'Hidden' });

    const response = await supertest(app.app).get('/public/menu');

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=30');
    expect(response.body.categories).toMatchObject([
      {
        name: 'Burgers',
        products: [
          { name: 'Smash', fromPriceInCents: 3000, optionGroups: [{ name: 'Pão' }] },
          { name: 'Salada', isAvailable: false },
        ],
      },
      { name: 'Bebidas', products: [{ name: 'Coca' }] },
    ]);
  });

  it('should return a single product and 404 for an inactive one', async () => {
    const burgers = await createCategory('Burgers');
    const smash = await createProduct(burgers.id, { name: 'Smash' });
    const old = await createProduct(burgers.id, { isActive: false });

    const found = await supertest(app.app).get(`/public/products/${smash.id}`);
    const hidden = await supertest(app.app).get(`/public/products/${old.id}`);

    expect(found.body).toMatchObject({ id: smash.id, optionGroups: [] });
    expect(hidden.statusCode).toBe(404);
  });
});
