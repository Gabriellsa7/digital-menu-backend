import { ICategoryUsage } from '../../../domain/category/interfaces/category-usage.interface';
import { IOptionGroupUsage } from '../../../domain/option-group/interfaces/option-group-usage.interface';
import { Mproduct } from '../../db/mongo/models/product.model';

export class ProductUsage implements ICategoryUsage, IOptionGroupUsage {
  async countProductsInCategory(categoryId: string): Promise<number> {
    return Mproduct.countDocuments({ categoryId });
  }

  async countProductsUsingOptionGroup(optionGroupId: string): Promise<number> {
    return Mproduct.countDocuments({ optionGroupIds: optionGroupId });
  }
}
