import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { Mcategory } from '../../infrastructure/db/mongo/models/category.model';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';
import { as } from '../helpers/http.helper';
import { loginAs } from '../helpers/staff-session.helper';

let staffToken: string;

function createCategory(name: string) {
  return as(staffToken).post('/admin/categories').send({ name });
}

beforeEach(async () => {
  await Mcategory.deleteMany({});
  await Mcategory.syncIndexes();
  ({ accessToken: staffToken } = await loginAs());
});

describe('When staff manages categories', () => {
  it('should create, rename, deactivate and delete a category', async () => {
    const created = await createCategory('Burgers');
    const updated = await as(staffToken)
      .put(`/admin/categories/${created.body.id}`)
      .send({ name: 'Smash burgers', isActive: false });
    const deleted = await as(staffToken).delete(
      `/admin/categories/${created.body.id}`,
    );

    expect(created.statusCode).toBe(201);
    expect(created.body).toMatchObject({ name: 'Burgers', position: 0 });
    expect(updated.body).toMatchObject({
      name: 'Smash burgers',
      isActive: false,
    });
    expect(deleted.statusCode).toBe(204);
  });

  it('should answer 409 for a duplicated name (CAT-R01)', async () => {
    await createCategory('Bebidas');

    const { body, statusCode } = await createCategory('bebidas');

    expect(statusCode).toBe(409);
    expect(body.code).toBe('CATEGORY_NAME_IN_USE');
  });

  it('should reorder the categories (CAT-R03)', async () => {
    const burgers = await createCategory('Burgers');
    const drinks = await createCategory('Bebidas');

    const reordered = await as(staffToken)
      .put('/admin/categories/order')
      .send({ ids: [drinks.body.id, burgers.body.id] });
    const incomplete = await as(staffToken)
      .put('/admin/categories/order')
      .send({ ids: [drinks.body.id] });

    expect(reordered.body.map(({ name }: { name: string }) => name)).toEqual([
      'Bebidas',
      'Burgers',
    ]);
    expect(incomplete.statusCode).toBe(422);
  });

  it('should answer 404 for an unknown category', async () => {
    const { statusCode } = await as(staffToken)
      .put('/admin/categories/unknown')
      .send({ name: 'Nothing' });

    expect(statusCode).toBe(404);
  });
});

describe('When someone without a staff token calls the categories', () => {
  it('should answer 401 anonymously and 403 to a customer', async () => {
    const { accessToken } = await loginCustomerWithOtp();

    const anonymous = await supertest(app.app).get('/admin/categories');
    const customer = await as(accessToken).get('/admin/categories');

    expect(anonymous.statusCode).toBe(401);
    expect(customer.statusCode).toBe(403);
  });
});
