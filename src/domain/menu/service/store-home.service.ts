import { ErrorHandler } from '../../common/decorators/error-handler.decorator';
import { IClock } from '../../common/clock.interface';
import { ICategoryService } from '../../category/interfaces/category.service.interface';
import { ICoupon } from '../../coupon/interfaces/coupon.interface';
import { ICouponService } from '../../coupon/interfaces/coupon.service.interface';
import { IOptionGroupService } from '../../option-group/interfaces/option-group.service.interface';
import { IProduct } from '../../product/interfaces/product.interface';
import { IProductService } from '../../product/interfaces/product.service.interface';
import { activePromotion, isNewProduct } from '../../product/product-pricing';
import { IStoreService } from '../../store/interfaces/store.service.interface';
import { IMenuProduct } from '../interfaces/menu.interface';
import { IBestSellersReader } from '../interfaces/best-sellers.reader.interface';
import { IPublicCoupon, IStoreHome } from '../interfaces/store-home.interface';
import {
  IParamsStoreHomeService,
  IStoreHomeService,
} from '../interfaces/store-home.service.interface';
import { toMenuProduct } from '../menu-product.factory';

const MAX_FEATURED = 5;
const MAX_PROMOTIONS = 12;
const MAX_BEST_SELLERS = 10;
const MIN_BEST_SELLERS = 3;
const MAX_NEW_ARRIVALS = 6;
const MAX_PUBLIC_COUPONS = 3;
const BEST_SELLERS_WINDOW_DAYS = 7;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export class StoreHomeService implements IStoreHomeService {
  private storeService: IStoreService;
  private categoryService: ICategoryService;
  private productService: IProductService;
  private optionGroupService: IOptionGroupService;
  private couponService: ICouponService;
  private bestSellersReader: IBestSellersReader;
  private clock: IClock;

  constructor({
    storeService,
    categoryService,
    productService,
    optionGroupService,
    couponService,
    bestSellersReader,
    clock,
  }: IParamsStoreHomeService) {
    this.storeService = storeService;
    this.categoryService = categoryService;
    this.productService = productService;
    this.optionGroupService = optionGroupService;
    this.couponService = couponService;
    this.bestSellersReader = bestSellersReader;
    this.clock = clock;
  }

  @ErrorHandler()
  async getStoreHome(storeSlug: string): Promise<IStoreHome> {
    const { store } =
      await this.storeService.getPublishedStoreBySlug(storeSlug);
    const now = this.clock.now();
    const [categories, products, coupons, bestSellers] = await Promise.all([
      this.categoryService.listCategories(store.id),
      this.productService.listActiveProducts(store.id),
      this.couponService.listCoupons(store.id, true),
      this.bestSellersReader.listBestSellers(
        store.id,
        new Date(
          now.getTime() - BEST_SELLERS_WINDOW_DAYS * MILLISECONDS_PER_DAY,
        ),
        MAX_BEST_SELLERS,
      ),
    ]);
    const activeCategories = categories.filter(({ isActive }) => isActive);
    const activeCategoryIds = new Set(activeCategories.map(({ id }) => id));
    const visible = products.filter(({ categoryId }) =>
      activeCategoryIds.has(categoryId),
    );
    const menuProducts = await this.toMenuProducts(store.id, visible, now);
    const toMenu = (product: IProduct) => menuProducts.get(product.id)!;

    const ranked = bestSellers
      .filter(({ productId }) => menuProducts.has(productId))
      .map(({ productId, soldCount }) => ({
        product: menuProducts.get(productId)!,
        soldCount,
      }));

    return {
      featured: visible
        .filter(({ isFeatured, isAvailable }) => isFeatured && isAvailable)
        .slice(0, MAX_FEATURED)
        .map(toMenu),
      promotions: visible
        .filter((product) => activePromotion(product, now))
        .map(toMenu)
        .sort(
          (a, b) => b.promotion!.discountPercent - a.promotion!.discountPercent,
        )
        .slice(0, MAX_PROMOTIONS),
      bestSellers: ranked.length >= MIN_BEST_SELLERS ? ranked : [],
      newArrivals: visible
        .filter((product) => isNewProduct(product, now))
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, MAX_NEW_ARRIVALS)
        .map(toMenu),
      publicCoupons: coupons
        .filter((coupon) => this.isShownOnHome(coupon, now))
        .slice(0, MAX_PUBLIC_COUPONS)
        .map(toPublicCoupon),
      categories: activeCategories
        .map(({ id, name }) => ({
          id,
          name,
          productCount: visible.filter(({ categoryId }) => categoryId === id)
            .length,
        }))
        .filter(({ productCount }) => productCount > 0),
    };
  }

  private async toMenuProducts(
    storeId: string,
    products: IProduct[],
    now: Date,
  ): Promise<Map<string, IMenuProduct>> {
    const groupIds = [...new Set(products.flatMap((p) => p.optionGroupIds))];
    const optionGroups = await this.optionGroupService.findOptionGroupsByIds(
      storeId,
      groupIds,
    );
    const groupsById = new Map(optionGroups.map((group) => [group.id, group]));
    return new Map(
      products.map((product) => [
        product.id,
        toMenuProduct(product, groupsById, now),
      ]),
    );
  }

  private isShownOnHome(coupon: ICoupon, now: Date): boolean {
    const isValidNow =
      coupon.startsAt.getTime() <= now.getTime() &&
      now.getTime() < coupon.expiresAt.getTime();
    const hasUsesLeft =
      coupon.usageLimit === undefined || coupon.usedCount < coupon.usageLimit;
    return coupon.isPublic && isValidNow && hasUsesLeft;
  }
}

function toPublicCoupon(coupon: ICoupon): IPublicCoupon {
  return {
    code: coupon.code,
    type: coupon.type,
    value: coupon.value,
    ...(coupon.maxDiscountInCents !== undefined && {
      maxDiscountInCents: coupon.maxDiscountInCents,
    }),
    minOrderInCents: coupon.minOrderInCents,
    firstOrderOnly: coupon.firstOrderOnly,
    expiresAt: coupon.expiresAt,
  };
}
