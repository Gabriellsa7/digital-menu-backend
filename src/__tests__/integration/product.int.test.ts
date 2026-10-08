import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { StoreServiceFactory } from '../../infrastructure/config/factories/store.service.factory';
import { as } from '../helpers/http.helper';
import {
  clearCatalog,
  createCategory,
  createOptionGroup,
  createProduct,
} from '../helpers/catalog.helper';
import { loginAs } from '../helpers/staff-session.helper';

let staffToken: string;

beforeEach(async () => {
  await clearCatalog();
  ({ accessToken: staffToken } = await loginAs());
});

describe('When staff manages products', () => {
  it('should create, update, toggle and delete a product', async () => {
    const category = await createCategory('Burgers');
    const extras = await createOptionGroup();

    const created = await as(staffToken)
      .post('/admin/products')
      .send({
        categoryId: category.id,
        name: 'Smash',
        priceInCents: 3290,
        optionGroupIds: [extras.id],
      });
    const updated = await as(staffToken)
      .put(`/admin/products/${created.body.id}`)
      .send({ categoryId: category.id, name: 'Smash duplo', priceInCents: 3990 });
    const soldOut = await as(staffToken)
      .patch(`/admin/products/${created.body.id}/availability`)
      .send({ isAvailable: false });
    const deleted = await as(staffToken).delete(
      `/admin/products/${created.body.id}`,
    );

    expect(created.statusCode).toBe(201);
    expect(created.body).toMatchObject({
      name: 'Smash',
      position: 0,
      isActive: true,
      optionGroupIds: [extras.id],
    });
    expect(updated.body).toMatchObject({
      name: 'Smash duplo',
      optionGroupIds: [],
    });
    expect(soldOut.body.isAvailable).toBe(false);
    expect(deleted.statusCode).toBe(204);
  });

  it('should answer 404 for an unknown category (PRD-R02)', async () => {
    const { statusCode } = await as(staffToken)
      .post('/admin/products')
      .send({ categoryId: 'unknown', name: 'Ghost', priceInCents: 100 });

    expect(statusCode).toBe(404);
  });

  it('should answer 422 for a free product without required options (PRD-R01)', async () => {
    const category = await createCategory();

    const { body, statusCode } = await as(staffToken)
      .post('/admin/products')
      .send({ categoryId: category.id, name: 'Açaí', priceInCents: 0 });

    expect(statusCode).toBe(422);
    expect(body.code).toBe('FREE_PRODUCT_NEEDS_REQUIRED_OPTIONS');
  });

  it('should filter, search and paginate the list', async () => {
    const burgers = await createCategory('Burgers');
    const drinks = await createCategory('Drinks');
    await createProduct(burgers.id, { name: 'Smash' });
    await createProduct(burgers.id, { name: 'Cheddar burger' });
    await createProduct(drinks.id, { name: 'Smash shake' });

    const search = await as(staffToken)
      .get('/admin/products')
      .query({ categoryId: burgers.id, search: 'smash' });
    const page = await as(staffToken)
      .get('/admin/products')
      .query({ page: 2, limit: 2 });

    expect(search.body.total).toBe(1);
    expect(search.body.items[0].name).toBe('Smash');
    expect(page.body).toMatchObject({ total: 3, page: 2, limit: 2 });
    expect(page.body.items).toHaveLength(1);
  });

  it('should reorder the products of a category', async () => {
    const category = await createCategory();
    const first = await createProduct(category.id, { name: 'First' });
    const second = await createProduct(category.id, { name: 'Second' });

    const { body } = await as(staffToken)
      .put(`/admin/categories/${category.id}/products/order`)
      .send({ ids: [second.id, first.id] });

    expect(body.map(({ name }: { name: string }) => name)).toEqual([
      'Second',
      'First',
    ]);
  });
});

describe('When staff deletes catalog items still in use', () => {
  it('should block a category with products (CAT-R02)', async () => {
    const category = await createCategory();
    await createProduct(category.id);

    const { body, statusCode } = await as(staffToken).delete(
      `/admin/categories/${category.id}`,
    );

    expect(statusCode).toBe(422);
    expect(body.code).toBe('CATEGORY_NOT_EMPTY');
  });

  it('should block an option group linked to a product (OPT-R04)', async () => {
    const category = await createCategory();
    const extras = await createOptionGroup();
    await createProduct(category.id, { optionGroupIds: [extras.id] });

    const { body, statusCode } = await as(staffToken).delete(
      `/admin/option-groups/${extras.id}`,
    );

    expect(statusCode).toBe(422);
    expect(body.code).toBe('OPTION_GROUP_IN_USE');
  });
});

describe('When staff runs a promotion (PRM-R01..R03)', () => {
  it('should show the promotion in the menu and validate the price', async () => {
    const category = await createCategory('Burgers');
    const smash = await createProduct(category.id, { priceInCents: 3000 });
    const { slug } = await StoreServiceFactory.create().getStore(smash.storeId);
    const now = Date.now();
    const period = {
      startsAt: new Date(now - 60_000).toISOString(),
      endsAt: new Date(now + 86_400_000).toISOString(),
    };

    const invalid = await as(staffToken)
      .put(`/admin/products/${smash.id}/promotion`)
      .send({ ...period, priceInCents: 3000 });
    const saved = await as(staffToken)
      .put(`/admin/products/${smash.id}/promotion`)
      .send({ ...period, priceInCents: 2400 });
    const featured = await as(staffToken)
      .patch(`/admin/products/${smash.id}/featured`)
      .send({ isFeatured: true });
    const menu = await supertest(app.app).get(`/public/stores/${slug}/menu`);

    expect(invalid.body.code).toBe('INVALID_PROMOTION_PRICE');
    expect(saved.body.promotion).toMatchObject({ priceInCents: 2400 });
    expect(featured.body.isFeatured).toBe(true);
    expect(menu.body.categories[0].products[0]).toMatchObject({
      fromPriceInCents: 2400,
      isNew: true,
      promotion: { priceInCents: 2400, discountPercent: 20 },
    });
  });
});
