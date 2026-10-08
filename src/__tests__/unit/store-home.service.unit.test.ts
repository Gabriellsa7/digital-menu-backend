import { ICategoryService } from '../../domain/category/interfaces/category.service.interface';
import { ICouponService } from '../../domain/coupon/interfaces/coupon.service.interface';
import { StoreHomeService } from '../../domain/menu/service/store-home.service';
import { IOptionGroupService } from '../../domain/option-group/interfaces/option-group.service.interface';
import { IProductService } from '../../domain/product/interfaces/product.service.interface';
import { IStoreService } from '../../domain/store/interfaces/store.service.interface';
import {
  aCategoryFixture,
  aCouponFixture,
  aProductFixture,
} from '../helpers/catalog.fixtures';
import { FixedClock } from '../helpers/fixed.clock';

const NOW = '2026-10-15T12:00:00.000Z';
const OLD = new Date('2026-09-01T00:00:00Z');
const PROMOTION = {
  startsAt: new Date('2026-10-01T00:00:00Z'),
  endsAt: new Date('2026-10-30T00:00:00Z'),
};

const products = [
  aProductFixture({ id: 'a', isFeatured: true, createdAt: OLD }),
  aProductFixture({
    id: 'b',
    promotion: { ...PROMOTION, priceInCents: 2700 },
    createdAt: OLD,
  }),
  aProductFixture({
    id: 'c',
    promotion: { ...PROMOTION, priceInCents: 1500 },
    isFeatured: true,
    isAvailable: false,
    createdAt: new Date('2026-10-10T00:00:00Z'),
  }),
  aProductFixture({ id: 'd', categoryId: 'hidden', isFeatured: true }),
];
const bestSellersReader = { listBestSellers: jest.fn() };

function aHomeService() {
  return new StoreHomeService({
    storeService: {
      getPublishedStoreBySlug: jest
        .fn()
        .mockResolvedValue({ store: { id: 'store-1' } }),
    } as unknown as IStoreService,
    categoryService: {
      listCategories: jest
        .fn()
        .mockResolvedValue([
          aCategoryFixture(),
          aCategoryFixture({ id: 'hidden', isActive: false }),
        ]),
    } as unknown as ICategoryService,
    productService: {
      listActiveProducts: jest.fn().mockResolvedValue(products),
    } as unknown as IProductService,
    optionGroupService: {
      findOptionGroupsByIds: jest.fn().mockResolvedValue([]),
    } as unknown as IOptionGroupService,
    couponService: {
      listCoupons: jest
        .fn()
        .mockResolvedValue([
          aCouponFixture({ code: 'PUBLICO', isPublic: true }),
          aCouponFixture({ code: 'PRIVADO' }),
          aCouponFixture({
            code: 'ESGOTADO',
            isPublic: true,
            usageLimit: 1,
            usedCount: 1,
          }),
        ]),
    } as unknown as ICouponService,
    bestSellersReader,
    clock: new FixedClock(NOW),
  });
}

describe('When a visitor opens the store home (HOM-R01..R06)', () => {
  it('should build every section from active products of active categories', async () => {
    bestSellersReader.listBestSellers.mockResolvedValue([
      { productId: 'b', soldCount: 9 },
      { productId: 'a', soldCount: 4 },
      { productId: 'c', soldCount: 2 },
    ]);

    const home = await aHomeService().getStoreHome('casa-brasa');

    expect(home.featured.map(({ id }) => id)).toEqual(['a']);
    expect(home.promotions.map(({ id }) => id)).toEqual(['c', 'b']);
    expect(home.bestSellers.map(({ product }) => product.id)).toEqual([
      'b',
      'a',
      'c',
    ]);
    expect(home.newArrivals.map(({ id }) => id)).toEqual(['c']);
    expect(home.publicCoupons.map(({ code }) => code)).toEqual(['PUBLICO']);
    expect(home.categories).toEqual([
      { id: 'burgers', name: 'Burgers', productCount: 3 },
    ]);
    expect(bestSellersReader.listBestSellers).toHaveBeenCalledWith(
      'store-1',
      new Date('2026-10-08T12:00:00.000Z'),
      10,
    );
  });

  it('should hide the best sellers below 3 products (HOM-R03)', async () => {
    bestSellersReader.listBestSellers.mockResolvedValue([
      { productId: 'a', soldCount: 4 },
      { productId: 'd', soldCount: 3 },
    ]);

    const home = await aHomeService().getStoreHome('casa-brasa');

    expect(home.bestSellers).toEqual([]);
  });
});
