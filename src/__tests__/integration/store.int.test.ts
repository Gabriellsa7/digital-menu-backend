import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { Mstore } from '../../infrastructure/db/mongo/models/store.model';
import { as } from '../helpers/http.helper';
import { StoreServiceFactory } from '../../infrastructure/config/factories/store.service.factory';
import { createStore, loginAs } from '../helpers/staff-session.helper';
import { createCategory } from '../helpers/catalog.helper';
import { ProductServiceFactory } from '../../infrastructure/config/factories/product.service.factory';

const EVERY_DAY_ALL_DAY = [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, opensAt: '00:00', closesAt: '12:00' },
  { weekday, opensAt: '12:00', closesAt: '00:00' },
]);

beforeEach(async () => {
  await Mstore.deleteMany({});
});

describe('When anyone lists the store directory', () => {
  it('should list only published, active stores, filtered by name', async () => {
    await createStore('Casa Brasa');
    await createStore('Pizza Boa');
    await StoreServiceFactory.create().createStore({ name: 'Brasa Oculta' });

    const all = await supertest(app.app).get('/public/stores');
    const search = await supertest(app.app)
      .get('/public/stores')
      .query({ search: 'brasa', limit: 1 });

    expect(all.body.items.map(({ slug }: { slug: string }) => slug)).toEqual([
      'casa-brasa',
      'pizza-boa',
    ]);
    expect(search.body).toMatchObject({
      total: 1,
      page: 1,
      limit: 1,
      items: [{ slug: 'casa-brasa', status: { manualStatus: 'AUTO' } }],
    });
  });
});

describe('When anyone reads a public store by slug', () => {
  it('should answer the published store with its status', async () => {
    const store = await createStore('Casa Brasa');

    const { body, statusCode } = await supertest(app.app).get(
      '/public/stores/casa-brasa',
    );

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      id: store.id,
      slug: 'casa-brasa',
      timezone: 'America/Sao_Paulo',
      status: { isOpenNow: false, manualStatus: 'AUTO' },
    });
  });

  it('should answer 404 STORE_NOT_FOUND for an unpublished store (TEN-R06)', async () => {
    await StoreServiceFactory.create().createStore({ name: 'Hidden' });

    const { body, statusCode } = await supertest(app.app).get(
      '/public/stores/hidden',
    );

    expect(statusCode).toBe(404);
    expect(body.code).toBe('STORE_NOT_FOUND');
  });

  it('should compute isOpenNow from the saved schedule', async () => {
    const { accessToken, staffUser } = await loginAs(EStaffRole.OWNER);
    await as(accessToken)
      .put('/admin/store/opening-hours')
      .send({ openingHours: EVERY_DAY_ALL_DAY });
    const store = await StoreServiceFactory.create().getStore(
      staffUser.storeId,
    );

    const { body } = await supertest(app.app).get(
      `/public/stores/${store.slug}`,
    );

    expect(body.status.isOpenNow).toBe(true);
    expect(body.openingHours).toHaveLength(14);
  });
});

describe('When two stores are managed at the same time (TEN-R03)', () => {
  it('should only change the store of the token', async () => {
    const storeA = await createStore('Casa Brasa');
    const storeB = await createStore('Pizza Boa');
    const ownerA = await loginAs(EStaffRole.OWNER, storeA.id);
    const ownerB = await loginAs(EStaffRole.OWNER, storeB.id);

    await as(ownerA.accessToken)
      .put('/admin/store')
      .send({ minimumOrderInCents: 4000 });
    const { body: adminB } = await as(ownerB.accessToken).get('/admin/store');
    const { body: publicA } = await supertest(app.app).get(
      '/public/stores/casa-brasa',
    );

    expect(publicA.minimumOrderInCents).toBe(4000);
    expect(adminB).toMatchObject({ id: storeB.id, minimumOrderInCents: 0 });
  });

  it('should answer 409 SLUG_TAKEN when the slug belongs to another store', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);
    await createStore('Casa Brasa');

    const { body, statusCode } = await as(accessToken)
      .put('/admin/store')
      .send({ slug: 'casa-brasa' });

    expect(statusCode).toBe(409);
    expect(body.code).toBe('SLUG_TAKEN');
  });
});

describe('When the owner updates the store settings', () => {
  it('should save the settings (STO-R07)', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);

    const { body, statusCode } = await as(accessToken)
      .put('/admin/store')
      .send({ name: 'Burger House', minimumOrderInCents: 2500 });

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      name: 'Burger House',
      minimumOrderInCents: 2500,
    });
  });

  it('should answer 403 to a STAFF user (STO-R07)', async () => {
    const { accessToken } = await loginAs(EStaffRole.STAFF);

    const { statusCode } = await as(accessToken)
      .put('/admin/store')
      .send({ name: 'Burger House' });

    expect(statusCode).toBe(403);
  });

  it('should answer 422 when every fulfillment type is disabled (STO-R06)', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);

    const { body, statusCode } = await as(accessToken)
      .put('/admin/store')
      .send({ deliveryEnabled: false, pickupEnabled: false });

    expect(statusCode).toBe(422);
    expect(body.code).toBe('NO_FULFILLMENT_ENABLED');
  });

  it('should answer 422 for overlapping hours (STO-R04)', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);

    const { body, statusCode } = await as(accessToken)
      .put('/admin/store/opening-hours')
      .send({
        openingHours: [
          { weekday: 1, opensAt: '10:00', closesAt: '15:00' },
          { weekday: 1, opensAt: '14:00', closesAt: '18:00' },
        ],
      });

    expect(statusCode).toBe(422);
    expect(body.code).toBe('OVERLAPPING_HOURS');
  });
});

describe('When staff toggles the store status', () => {
  it('should let a STAFF user force the store open (STO-R07)', async () => {
    const { accessToken } = await loginAs(EStaffRole.STAFF);

    const { body, statusCode } = await as(accessToken)
      .patch('/admin/store/status')
      .send({ manualStatus: 'FORCED_OPEN' });

    expect(statusCode).toBe(200);
    expect(body.status).toMatchObject({
      isOpenNow: true,
      manualStatus: 'FORCED_OPEN',
    });
  });

  it('should let FORCED_CLOSED beat the schedule (STO-R05)', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);
    await as(accessToken)
      .put('/admin/store/opening-hours')
      .send({ openingHours: EVERY_DAY_ALL_DAY });

    await as(accessToken)
      .patch('/admin/store/status')
      .send({ manualStatus: 'FORCED_CLOSED' });
    const { body } = await as(accessToken).get('/admin/store');

    expect(body.status.isOpenNow).toBe(false);
  });
});

describe('When the owner publishes the store (TEN-R06)', () => {
  it('should refuse until the store has products and opening hours', async () => {
    const store = await StoreServiceFactory.create().createStore({
      name: 'Nova Loja',
    });
    const { accessToken } = await loginAs(EStaffRole.OWNER, store.id);

    const notReady = await as(accessToken)
      .patch('/admin/store/publish')
      .send({ isPublished: true });
    await as(accessToken)
      .put('/admin/store/opening-hours')
      .send({ openingHours: EVERY_DAY_ALL_DAY });
    const category = await createCategory('Burgers', store.id);
    await ProductServiceFactory.create().createProduct({
      storeId: store.id,
      categoryId: category.id,
      name: 'Smash',
      description: '',
      priceInCents: 3000,
      optionGroupIds: [],
      isAvailable: true,
      isActive: true,
    });
    const published = await as(accessToken)
      .patch('/admin/store/publish')
      .send({ isPublished: true });
    const publicRead = await supertest(app.app).get('/public/stores/nova-loja');

    expect(notReady.statusCode).toBe(422);
    expect(notReady.body).toMatchObject({
      code: 'STORE_NOT_READY',
      details: { missing: ['products', 'openingHours'] },
    });
    expect(published.body.isPublished).toBe(true);
    expect(publicRead.statusCode).toBe(200);
  });

  it('should answer 403 to a STAFF user', async () => {
    const { accessToken } = await loginAs(EStaffRole.STAFF);

    const { statusCode } = await as(accessToken)
      .patch('/admin/store/publish')
      .send({ isPublished: false });

    expect(statusCode).toBe(403);
  });
});
