import { ICategoryUsage } from '../../domain/category/interfaces/category-usage.interface';

export class EmptyCatalogUsage implements ICategoryUsage {
  async countProductsInCategory(): Promise<number> {
    return 0;
  }
}
