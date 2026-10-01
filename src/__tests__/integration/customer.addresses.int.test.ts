import supertest from 'supertest';
import { app } from '../../../jest/setup-integration-tests';
import { loginCustomerWithOtp } from '../helpers/customer-session.helper';

const AN_ADDRESS = {
  label: 'Casa',
  zipCode: '04101300',
  street: 'Rua Vergueiro',
  number: '1000',
  neighborhood: 'Vila Mariana',
  city: 'São Paulo',
  state: 'SP',
};

let accessToken: string;

function authorized(request: supertest.Test): supertest.Test {
  return request.set('Authorization', `Bearer ${accessToken}`);
}

async function addAddress(overrides: Record<string, unknown> = {}) {
  return authorized(supertest(app.app).post('/me/addresses')).send({
    ...AN_ADDRESS,
    ...overrides,
  });
}

beforeEach(async () => {
  ({ accessToken } = await loginCustomerWithOtp());
});

describe('When the customer adds an address', () => {
  it('should save the first address as the default one', async () => {
    const { body, statusCode } = await addAddress({ complement: 'Apto 12' });

    expect(statusCode).toBe(201);
    expect(body).toMatchObject({
      ...AN_ADDRESS,
      complement: 'Apto 12',
      isDefault: true,
    });
    expect(body.id).toEqual(expect.any(String));
    // No delivery zone module yet: every address is "not served"
    expect(body.deliveryZoneId).toBeUndefined();
  });

  it('should move the default flag when a new default is added', async () => {
    await addAddress();
    await addAddress({ label: 'Trabalho', isDefault: true });

    const { body } = await authorized(supertest(app.app).get('/me/addresses'));

    expect(
      body.map(
        ({ label, isDefault }: { label: string; isDefault: boolean }) => ({
          label,
          isDefault,
        }),
      ),
    ).toEqual([
      { label: 'Casa', isDefault: false },
      { label: 'Trabalho', isDefault: true },
    ]);
  });

  it('should return 422 ADDRESS_LIMIT_REACHED after 5 addresses', async () => {
    for (let index = 0; index < 5; index += 1) {
      await addAddress({ label: `Endereço ${index}` });
    }

    const { body, statusCode } = await addAddress({ label: 'Sexto' });

    expect(statusCode).toBe(422);
    expect(body.code).toBe('ADDRESS_LIMIT_REACHED');
  });

  it('should return 400 for an invalid zip code', async () => {
    const { statusCode } = await addAddress({ zipCode: '04101-300' });

    expect(statusCode).toBe(400);
  });
});

describe('When the customer changes an address', () => {
  it('should replace the data and keep the default flag', async () => {
    const { body: created } = await addAddress();

    const { body, statusCode } = await authorized(
      supertest(app.app).put(`/me/addresses/${created.id}`),
    ).send({ ...AN_ADDRESS, number: '2000' });

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      id: created.id,
      number: '2000',
      isDefault: true,
    });
  });

  it('should set another address as default', async () => {
    await addAddress();
    const { body: work } = await addAddress({ label: 'Trabalho' });

    const { body, statusCode } = await authorized(
      supertest(app.app).patch(`/me/addresses/${work.id}/default`),
    );

    expect(statusCode).toBe(200);
    expect(
      body.find(({ id }: { id: string }) => id === work.id).isDefault,
    ).toBe(true);
  });

  it('should promote another address when the default one is removed', async () => {
    const { body: home } = await addAddress();
    await addAddress({ label: 'Trabalho' });

    const remove = await authorized(
      supertest(app.app).delete(`/me/addresses/${home.id}`),
    );
    const { body } = await authorized(supertest(app.app).get('/me/addresses'));

    expect(remove.statusCode).toBe(204);
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({ label: 'Trabalho', isDefault: true });
  });

  it('should return 404 for an address of another customer', async () => {
    const { body: created } = await addAddress();
    ({ accessToken } = await loginCustomerWithOtp());

    const { body, statusCode } = await authorized(
      supertest(app.app).delete(`/me/addresses/${created.id}`),
    );

    expect(statusCode).toBe(404);
    expect(body.message).toBe('Address not found');
  });
});
