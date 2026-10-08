import { MoptionGroup } from '../../infrastructure/db/mongo/models/option-group.model';
import { as } from '../helpers/http.helper';
import { EStaffRole } from '../../domain/staff-user/interfaces/staff-user.interface';
import { createStore, loginAs } from '../helpers/staff-session.helper';

const A_GROUP = {
  name: 'Ponto da carne',
  minSelections: 1,
  maxSelections: 1,
  allowRepeat: false,
  options: [
    { name: 'Mal passado', priceInCents: 0 },
    { name: 'Ao ponto', priceInCents: 0 },
  ],
};

let staffToken: string;

beforeEach(async () => {
  await MoptionGroup.deleteMany({});
  ({ accessToken: staffToken } = await loginAs());
});

describe('When staff manages option groups', () => {
  it('should create, read, update and delete a group', async () => {
    const created = await as(staffToken)
      .post('/admin/option-groups')
      .send(A_GROUP);
    const id = created.body.id;
    const firstOption = created.body.options[0];
    const updated = await as(staffToken)
      .put(`/admin/option-groups/${id}`)
      .send({
        ...A_GROUP,
        options: [{ ...firstOption, name: 'Bem passado' }],
      });
    const read = await as(staffToken).get(`/admin/option-groups/${id}`);
    const deleted = await as(staffToken).delete(`/admin/option-groups/${id}`);

    expect(created.statusCode).toBe(201);
    expect(created.body.options).toHaveLength(2);
    expect(updated.body.options).toEqual([
      { ...firstOption, name: 'Bem passado' },
    ]);
    expect(read.body.name).toBe('Ponto da carne');
    expect(deleted.statusCode).toBe(204);
  });

  it('should answer 422 for max above the options without repeats (OPT-R02)', async () => {
    const { body, statusCode } = await as(staffToken)
      .post('/admin/option-groups')
      .send({ ...A_GROUP, minSelections: 0, maxSelections: 3 });

    expect(statusCode).toBe(422);
    expect(body.code).toBe('MAX_SELECTIONS_ABOVE_OPTIONS');
  });

  it('should answer 400 for a group without options (OPT-R03)', async () => {
    const { statusCode } = await as(staffToken)
      .post('/admin/option-groups')
      .send({ ...A_GROUP, options: [] });

    expect(statusCode).toBe(400);
  });

  it('should mark an option as sold out', async () => {
    const created = await as(staffToken)
      .post('/admin/option-groups')
      .send(A_GROUP);
    const optionId = created.body.options[1].id;

    const { body } = await as(staffToken)
      .patch(
        `/admin/option-groups/${created.body.id}/options/${optionId}/availability`,
      )
      .send({ isAvailable: false });
    const unknown = await as(staffToken)
      .patch(
        `/admin/option-groups/${created.body.id}/options/unknown/availability`,
      )
      .send({ isAvailable: false });

    expect(body.options[1].isAvailable).toBe(false);
    expect(body.options[0].isAvailable).toBe(true);
    expect(unknown.statusCode).toBe(404);
  });
});

describe('When two stores manage option groups (TEN-R04)', () => {
  it('should hide the groups of one store from the other', async () => {
    const otherStore = await createStore('Pizza Boa');
    const { accessToken: otherToken } = await loginAs(
      EStaffRole.STAFF,
      otherStore.id,
    );
    const created = await as(staffToken)
      .post('/admin/option-groups')
      .send(A_GROUP);

    const listed = await as(otherToken).get('/admin/option-groups');
    const read = await as(otherToken).get(
      `/admin/option-groups/${created.body.id}`,
    );
    const deleted = await as(otherToken).delete(
      `/admin/option-groups/${created.body.id}`,
    );

    expect(listed.body).toEqual([]);
    expect(read.statusCode).toBe(404);
    expect(deleted.statusCode).toBe(404);
    await expect(MoptionGroup.countDocuments()).resolves.toBe(1);
  });
});
