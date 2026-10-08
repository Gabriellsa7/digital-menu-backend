import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
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

describe('When we seed the demo stores', () => {
  it('should create two published stores and a draft, stable when run twice', async () => {
    await resetDatabase();

    await runSeed();
    const first = await countAll();
    await runSeed();
    const second = await countAll();
    const home = await supertest(app.app).get(
      '/public/stores/smash-bros-burger/home',
    );
    const directory = await supertest(app.app).get('/public/stores');

    expect(first).toEqual({
      store: 3,
      categories: 9,
      optionGroups: 6,
      products: 29,
      zones: 11,
      coupons: 4,
      staffUsers: 4,
      orders: 6,
    });
    expect(second).toEqual(first);
    const statuses = await Morder.distinct('status');
    expect(statuses.sort()).toEqual(['CANCELED', 'COMPLETED', 'PREPARING']);
    const manualStatuses = await Mstore.distinct('manualStatus');
    expect(manualStatuses).toEqual(['AUTO']);
    expect(
      directory.body.items.map(({ slug }: { slug: string }) => slug),
    ).toEqual(['forno-da-vila', 'smash-bros-burger']);
    expect(home.body.featured).toHaveLength(3);
    expect(home.body.promotions).toHaveLength(2);
    expect(home.body.bestSellers).toHaveLength(3);
    expect(home.body.publicCoupons).toEqual([
      expect.objectContaining({ code: 'BEMVINDO10' }),
    ]);

    await resetDatabase();
  });
});
