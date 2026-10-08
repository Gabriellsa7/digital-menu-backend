import { IStoreReadiness } from '../../../domain/store/interfaces/store-readiness.interface';
import { Mcategory } from '../../db/mongo/models/category.model';
import { Mproduct } from '../../db/mongo/models/product.model';

export class StoreReadiness implements IStoreReadiness {
  async countSellableProducts(storeId: string): Promise<number> {
    const activeCategoryIds = await Mcategory.distinct('id', {
      storeId,
      isActive: true,
    });
    return Mproduct.countDocuments({
      storeId,
      isActive: true,
      isAvailable: true,
      categoryId: { $in: activeCategoryIds },
    });
  }
}
