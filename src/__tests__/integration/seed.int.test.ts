import { Mcategory } from '../../infrastructure/db/mongo/models/category.model';
import { Mcoupon } from '../../infrastructure/db/mongo/models/coupon.model';
import { MdeliveryZone } from '../../infrastructure/db/mongo/models/delivery-zone.model';
import { MoptionGroup } from '../../infrastructure/db/mongo/models/option-group.model';
import { Morder } from '../../infrastructure/db/mongo/models/order.model';
import { Mproduct } from '../../infrastructure/db/mongo/models/product.model';
import { MstaffUser } from '../../infrastructure/db/mongo/models/staff-user.model';
import { Mstore } from '../../infrastructure/db/mongo/models/store.model';
import { resetDatabase, runSeed } from '../../scripts/run-seed';

async function countAll() {
  const models = {
    store: Mstore,
    categories: Mcategory,
    optionGroups: MoptionGroup,
    products: Mproduct,
    zones: MdeliveryZone,
    coupons: Mcoupon,
    staffUsers: MstaffUser,
    orders: Morder,
  };
  const counts = await Promise.all(
    Object.entries(models).map(
      async ([name, model]) =>
        [name, await (model as typeof Mstore).countDocuments()] as const,
    ),
  );
  return Object.fromEntries(counts);
}

describe('When we seed the demo store', () => {
  it('should create a realistic store and stay stable when run twice', async () => {
    await resetDatabase();

    await runSeed();
    const first = await countAll();
    await runSeed();
    const second = await countAll();

    expect(first).toEqual({
      store: 1,
      categories: 6,
      optionGroups: 5,
      products: 23,
      zones: 8,
      coupons: 3,
      staffUsers: 2,
      orders: 3,
    });
    expect(second).toEqual(first);
    const statuses = await Morder.distinct('status');
    expect(statuses.sort()).toEqual(['CANCELED', 'COMPLETED', 'PREPARING']);
    const store = await Mstore.findOne().lean();
    expect(store?.manualStatus).toBe('AUTO');

    await resetDatabase();
  });
});
