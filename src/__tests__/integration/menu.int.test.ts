import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { CategoryServiceFactory } from '../../infrastructure/config/factories/category.service.factory';
import { ECouponType } from '../../domain/coupon/interfaces/coupon.interface';
import { CouponServiceFactory } from '../../infrastructure/config/factories/coupon.service.factory';
import { ProductServiceFactory } from '../../infrastructure/config/factories/product.service.factory';
import { StoreServiceFactory } from '../../infrastructure/config/factories/store.service.factory';
import { Mcoupon } from '../../infrastructure/db/mongo/models/coupon.model';
import {
  clearCatalog,
  createCategory,
  createOptionGroup,
  createProduct,
} from '../helpers/catalog.helper';

let slug: string;

beforeEach(async () => {
  await clearCatalog();
  ({ slug } = await StoreServiceFactory.create().ensureDefaultStore());
});

describe('When a visitor opens the menu', () => {
  it('should return active categories with their products in order', async () => {
    const burgers = await createCategory('Burgers');
    const drinks = await createCategory('Bebidas');
    const hidden = await createCategory('Secret');
    await CategoryServiceFactory.create().updateCategory({
      storeId: hidden.storeId,
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

    const response = await supertest(app.app).get(
      `/places/slug/${slug}/menu`,
    );

    expect(response.statusCode).toBe(200);
    expect(response.headers['cache-control']).toBe('public, max-age=30');
    expect(response.body.categories).toMatchObject([
      {
        name: 'Burgers',
        products: [
          {
            name: 'Smash',
            fromPriceInCents: 3000,
            optionGroups: [{ name: 'Pão' }],
          },
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

    const found = await supertest(app.app).get(
      `/places/slug/${slug}/products/${smash.id}`,
    );
    const hidden = await supertest(app.app).get(
      `/places/slug/${slug}/products/${old.id}`,
    );

    expect(found.body).toMatchObject({ id: smash.id, optionGroups: [] });
    expect(hidden.statusCode).toBe(404);
  });

  it('should never show products of another store (TEN-R04)', async () => {
    const burgers = await createCategory('Burgers');
    const smash = await createProduct(burgers.id, { name: 'Smash' });
    const other = await StoreServiceFactory.create().createStore({
      name: 'Pizza Boa',
      isPublished: true,
    });

    const menu = await supertest(app.app).get(
      `/places/slug/${other.slug}/menu`,
    );
    const product = await supertest(app.app).get(
      `/places/slug/${other.slug}/products/${smash.id}`,
    );
    const unknownStore = await supertest(app.app).get(
      '/places/slug/unknown-store/menu',
    );

    expect(menu.body.categories).toEqual([]);
    expect(product.statusCode).toBe(404);
    expect(unknownStore.body.code).toBe('STORE_NOT_FOUND');
  });

  it('should serve the store home with featured products and public coupons', async () => {
    const burgers = await createCategory('Burgers');
    const smash = await createProduct(burgers.id, { name: 'Smash' });
    await ProductServiceFactory.create().setProductFeatured({
      storeId: smash.storeId,
      id: smash.id,
      isFeatured: true,
    });
    await Mcoupon.deleteMany({});
    await CouponServiceFactory.create().createCoupon({
      storeId: smash.storeId,
      code: 'BEMVINDO',
      type: ECouponType.FIXED,
      value: 1000,
      minOrderInCents: 0,
      startsAt: new Date(Date.now() - 60_000),
      expiresAt: new Date(Date.now() + 86_400_000),
      usagePerCustomer: 1,
      firstOrderOnly: true,
      isActive: true,
      isPublic: true,
    });

    const { body, statusCode } = await supertest(app.app).get(
      `/places/slug/${slug}/home`,
    );

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      featured: [{ id: smash.id, isNew: true }],
      bestSellers: [],
      newArrivals: [{ id: smash.id }],
      publicCoupons: [{ code: 'BEMVINDO', firstOrderOnly: true }],
      categories: [{ name: 'Burgers', productCount: 1 }],
    });
  });
});
