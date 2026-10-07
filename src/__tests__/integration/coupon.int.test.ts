import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { Mcoupon } from '../../infrastructure/db/mongo/models/coupon.model';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';
import { as } from '../helpers/http.helper';
import { loginAs } from '../helpers/staff-session.helper';

const A_COUPON = {
  code: 'bemvindo10',
  type: 'PERCENTAGE',
  value: 10,
  minOrderInCents: 2000,
  startsAt: '2020-01-01T00:00:00.000Z',
  expiresAt: '2099-01-01T00:00:00.000Z',
};

let ownerToken: string;

beforeEach(async () => {
  await Mcoupon.deleteMany({});
  ({ accessToken: ownerToken } = await loginAs(EStaffRole.OWNER));
});

describe('When the owner manages coupons', () => {
  it('should create, update, list and deactivate a coupon', async () => {
    const created = await as(ownerToken).post('/admin/coupons').send(A_COUPON);
    const updated = await as(ownerToken)
      .put(`/admin/coupons/${created.body.id}`)
      .send({ ...A_COUPON, value: 15, usageLimit: 50 });
    const deactivated = await as(ownerToken)
      .patch(`/admin/coupons/${created.body.id}/active`)
      .send({ isActive: false });
    const active = await as(ownerToken)
      .get('/admin/coupons')
      .query({ active: true });

    expect(created.statusCode).toBe(201);
    expect(created.body).toMatchObject({
      code: 'BEMVINDO10',
      usedCount: 0,
      usagePerCustomer: 1,
    });
    expect(updated.body).toMatchObject({ value: 15, usageLimit: 50 });
    expect(deactivated.body.isActive).toBe(false);
    expect(active.body).toHaveLength(0);
  });

  it('should answer 409 for a duplicated code (CPN-R01)', async () => {
    await as(ownerToken).post('/admin/coupons').send(A_COUPON);

    const { statusCode } = await as(ownerToken)
      .post('/admin/coupons')
      .send({ ...A_COUPON, code: 'BEMVINDO10' });

    expect(statusCode).toBe(409);
  });

});

describe('When a customer previews a coupon', () => {
  it('should return the discount or the broken rule (CPN-R03)', async () => {
    await as(ownerToken).post('/admin/coupons').send(A_COUPON);
    const { accessToken } = await loginCustomerWithOtp();
    const validate = (subtotalInCents: number) =>
      as(accessToken).post('/me/coupons/validate').send({
        code: 'bemvindo10',
        subtotalInCents,
        fulfillmentType: 'DELIVERY',
      });

    const valid = await validate(5000);
    const belowMinimum = await validate(1000);

    expect(valid.body).toEqual({
      code: 'BEMVINDO10',
      type: 'PERCENTAGE',
      value: 10,
      discountInCents: 500,
    });
    expect(belowMinimum.statusCode).toBe(422);
    expect(belowMinimum.body.code).toBe('COUPON_MIN_ORDER');
  });
});
