import { BusinessRuleError } from '../errors/business-rule.error';
import { IProduct, IProductPromotion } from './interfaces/product.interface';

const MAX_PROMOTION_DAYS = 60;
const NEW_PRODUCT_DAYS = 14;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export function activePromotion(
  product: Pick<IProduct, 'promotion'>,
  now: Date,
): IProductPromotion | undefined {
  const { promotion } = product;
  const isActive =
    promotion !== undefined &&
    promotion.startsAt.getTime() <= now.getTime() &&
    now.getTime() < promotion.endsAt.getTime();
  return isActive ? promotion : undefined;
}

export function effectivePriceInCents(
  product: Pick<IProduct, 'priceInCents' | 'promotion'>,
  now: Date,
): number {
  return activePromotion(product, now)?.priceInCents ?? product.priceInCents;
}

export function discountPercent(
  priceInCents: number,
  promotion: IProductPromotion,
): number {
  return Math.round(
    ((priceInCents - promotion.priceInCents) / priceInCents) * 100,
  );
}

export function isNewProduct(product: Pick<IProduct, 'createdAt'>, now: Date) {
  return (
    now.getTime() - product.createdAt.getTime() <
    NEW_PRODUCT_DAYS * MILLISECONDS_PER_DAY
  );
}

export function assertValidPromotion(
  priceInCents: number,
  promotion: IProductPromotion,
): void {
  if (
    promotion.priceInCents <= 0 ||
    promotion.priceInCents >= priceInCents
  ) {
    throw new BusinessRuleError(
      'The promotion price must be above 0 and below the product price',
      'INVALID_PROMOTION_PRICE',
    );
  }
  const durationInMilliseconds =
    promotion.endsAt.getTime() - promotion.startsAt.getTime();
  if (
    durationInMilliseconds <= 0 ||
    durationInMilliseconds > MAX_PROMOTION_DAYS * MILLISECONDS_PER_DAY
  ) {
    throw new BusinessRuleError(
      `A promotion must end after it starts and last at most ${MAX_PROMOTION_DAYS} days`,
      'INVALID_PROMOTION_PERIOD',
    );
  }
}
