import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { Mstore } from '../../infrastructure/db/mongo/models/store.model';
import { as } from '../helpers/http.helper';
import { loginAs } from '../helpers/staff-session.helper';

const EVERY_DAY_ALL_DAY = [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) => [
  { weekday, opensAt: '00:00', closesAt: '12:00' },
  { weekday, opensAt: '12:00', closesAt: '00:00' },
]);

beforeEach(async () => {
  await Mstore.deleteMany({});
});

describe('When anyone reads the public store', () => {
  it('should bootstrap a default store on the first GET', async () => {
    const first = await supertest(app.app).get('/public/store');
    const second = await supertest(app.app).get('/public/store');

    expect(first.statusCode).toBe(200);
    expect(first.body).toMatchObject({
      timezone: 'America/Sao_Paulo',
      status: { isOpenNow: false, manualStatus: 'AUTO' },
    });
    expect(second.body.id).toBe(first.body.id);
    await expect(Mstore.countDocuments()).resolves.toBe(1);
  });

  it('should compute isOpenNow from the saved schedule', async () => {
    const { accessToken } = await loginAs(EStaffRole.OWNER);
    await as(accessToken)
      .put('/admin/store/opening-hours')
      .send({ openingHours: EVERY_DAY_ALL_DAY });

    const { body } = await supertest(app.app).get('/public/store');

    expect(body.status.isOpenNow).toBe(true);
    expect(body.openingHours).toHaveLength(14);
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
