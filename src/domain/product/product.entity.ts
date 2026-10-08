import { BusinessRuleError } from '../errors/business-rule.error';
import { IOptionGroup } from '../option-group/interfaces/option-group.interface';
import { IProduct } from './interfaces/product.interface';

export class Product implements IProduct {
  public readonly id: string;
  public readonly storeId: string;
  public readonly categoryId: string;
  public readonly name: string;
  public readonly description: string;
  public readonly priceInCents: number;
  public readonly imageUrl?: string;
  public readonly imagePublicId?: string;
  public readonly optionGroupIds: string[];
  public readonly isAvailable: boolean;
  public readonly isActive: boolean;
  public readonly position: number;
  public readonly servesPeople?: number;
  public readonly createdAt: Date;
  public readonly updatedAt: Date;

  constructor(props: IProduct) {
    this.id = props.id;
    this.storeId = props.storeId;
    this.categoryId = props.categoryId;
    this.name = props.name.trim();
    this.description = props.description.trim();
    this.priceInCents = props.priceInCents;
    this.imageUrl = props.imageUrl;
    this.imagePublicId = props.imagePublicId;
    this.optionGroupIds = props.optionGroupIds;
    this.isAvailable = props.isAvailable;
    this.isActive = props.isActive;
    this.position = props.position;
    this.servesPeople = props.servesPeople;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  assertPricing(optionGroups: IOptionGroup[]): void {
    if (this.priceInCents < 0) {
      throw new BusinessRuleError(
        'Price cannot be negative',
        'INVALID_PRICE',
      );
    }
    const hasRequiredGroup = optionGroups.some(
      ({ minSelections }) => minSelections > 0,
    );
    if (this.priceInCents === 0 && !hasRequiredGroup) {
      throw new BusinessRuleError(
        'A product priced 0 needs at least one required option group',
        'FREE_PRODUCT_NEEDS_REQUIRED_OPTIONS',
      );
    }
  }
}
