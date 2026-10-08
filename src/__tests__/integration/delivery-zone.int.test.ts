import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { MdeliveryZone } from '../../infrastructure/db/mongo/models/delivery-zone.model';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';
import { as } from '../helpers/http.helper';
import { StoreServiceFactory } from '../../infrastructure/config/factories/store.service.factory';
import { createStore, loginAs } from '../helpers/staff-session.helper';

const A_ZONE = {
  name: 'Vila Mariana',
  city: 'São Paulo',
  feeInCents: 590,
  etaMinMinutes: 30,
  etaMaxMinutes: 45,
};

let ownerToken: string;
let store: { id: string; slug: string };

beforeEach(async () => {
  await MdeliveryZone.deleteMany({});
  await MdeliveryZone.syncIndexes();
  ({ accessToken: ownerToken } = await loginAs(EStaffRole.OWNER));
  store = await StoreServiceFactory.create().ensureDefaultStore();
});

async function createZone(overrides: Record<string, unknown> = {}) {
  return as(ownerToken)
    .post('/admin/delivery-zones')
    .send({ ...A_ZONE, ...overrides });
}

describe('When the owner manages delivery zones', () => {
  it('should create, update and delete a zone', async () => {
    const created = await createZone();
    const updated = await as(ownerToken)
      .put(`/admin/delivery-zones/${created.body.id}`)
      .send({ ...A_ZONE, feeInCents: 0 });
    const deleted = await as(ownerToken).delete(
      `/admin/delivery-zones/${created.body.id}`,
    );

    expect(created.statusCode).toBe(201);
    expect(created.body).toMatchObject({ ...A_ZONE, isActive: true });
    expect(updated.body.feeInCents).toBe(0);
    expect(deleted.statusCode).toBe(204);
  });

  it('should answer 409 for the same neighborhood with other accents (DLZ-R01)', async () => {
    await createZone();

    const { statusCode } = await createZone({ name: 'vila mariána' });

    expect(statusCode).toBe(409);
  });

  it('should answer 422 when the minimum ETA is above the maximum (DLZ-R02)', async () => {
    const { body, statusCode } = await createZone({ etaMinMinutes: 50 });

    expect(statusCode).toBe(422);
    expect(body.code).toBe('INVALID_ETA');
  });

  it('should let STAFF list but not create zones', async () => {
    const { accessToken } = await loginAs(EStaffRole.STAFF);

    const list = await as(accessToken).get('/admin/delivery-zones');
    const create = await as(accessToken)
      .post('/admin/delivery-zones')
      .send(A_ZONE);

    expect(list.statusCode).toBe(200);
    expect(create.statusCode).toBe(403);
  });
});

describe('When anyone reads the public delivery zones', () => {
  it('should list only active zones', async () => {
    await createZone();
    await createZone({ name: 'Moema', isActive: false });

    const { body } = await supertest(app.app).get(
      `/public/stores/${store.slug}/delivery-zones`,
    );

    expect(body).toHaveLength(1);
    expect(body[0]).not.toHaveProperty('isActive');
  });

  it('should resolve a neighborhood ignoring accents and casing', async () => {
    await createZone();

    const found = await supertest(app.app)
      .get(`/public/stores/${store.slug}/delivery-zones/resolve`)
      .query({ neighborhood: 'VILA MARIÁNA', city: 'sao paulo' });
    const missing = await supertest(app.app)
      .get(`/public/stores/${store.slug}/delivery-zones/resolve`)
      .query({ neighborhood: 'Moema', city: 'São Paulo' });

    expect(found.body.name).toBe('Vila Mariana');
    expect(missing.statusCode).toBe(404);
  });
});

describe('When a customer lists addresses for a store (CUS-R03)', () => {
  it('should resolve the delivery zone of that store only', async () => {
    const zone = await createZone();
    const otherStore = await createStore('Pizza Boa');
    const { accessToken } = await loginCustomerWithOtp();

    const { body: saved } = await as(accessToken).post('/me/addresses').send({
      label: 'Casa',
      zipCode: '04101300',
      street: 'Rua Vergueiro',
      number: '1000',
      neighborhood: 'vila mariana',
      city: 'São Paulo',
      state: 'SP',
    });
    const served = await as(accessToken).get(
      `/me/addresses?storeId=${store.id}`,
    );
    const notServed = await as(accessToken).get(
      `/me/addresses?storeId=${otherStore.id}`,
    );

    expect(saved).not.toHaveProperty('deliveryZoneId');
    expect(served.body[0].deliveryZoneId).toBe(zone.body.id);
    expect(notServed.body[0]).not.toHaveProperty('deliveryZoneId');
  });
});
