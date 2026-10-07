import { ICategoryUsage } from '../../domain/category/interfaces/category-usage.interface';
import { IOptionGroupUsage } from '../../domain/option-group/interfaces/option-group-usage.interface';

export class EmptyCatalogUsage implements ICategoryUsage, IOptionGroupUsage {
  async countProductsInCategory(): Promise<number> {
    return 0;
  }

  async countProductsUsingOptionGroup(): Promise<number> {
    return 0;
  }
}
