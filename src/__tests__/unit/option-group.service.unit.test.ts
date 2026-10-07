import { OptionGroupService } from '../../domain/option-group/service/option-group.service';
import { IOptionGroupRepositoryRead } from '../../domain/option-group/repository/option-group.repository.read';
import { IOptionGroupRepositoryWrite } from '../../domain/option-group/repository/option-group.repository.write';
import { IOptionGroupUsage } from '../../domain/option-group/interfaces/option-group-usage.interface';
import { IOptionGroup } from '../../domain/option-group/interfaces/option-group.interface';
import { NotFoundError } from '../../domain/errors/not-found.error';
import { FixedClock } from '../helpers/fixed.clock';

const clock = new FixedClock();
const GROUP_DATA = {
  name: 'Adicionais',
  minSelections: 0,
  maxSelections: 3,
  allowRepeat: true,
  options: [
    { name: 'Bacon', priceInCents: 400 },
    { name: 'Cheddar', priceInCents: 300, isAvailable: false },
  ],
};

function aGroup(overrides: Partial<IOptionGroup> = {}): IOptionGroup {
  return {
    ...GROUP_DATA,
    id: 'group-1',
    options: [
      { id: 'bacon', name: 'Bacon', priceInCents: 400, isAvailable: true },
    ],
    createdAt: clock.now(),
    updatedAt: clock.now(),
    ...overrides,
  };
}

let optionGroupRepositoryRead: jest.Mocked<IOptionGroupRepositoryRead>;
let optionGroupRepositoryWrite: jest.Mocked<IOptionGroupRepositoryWrite>;
let optionGroupUsage: jest.Mocked<IOptionGroupUsage>;
let optionGroupService: OptionGroupService;

beforeEach(() => {
  optionGroupRepositoryRead = {
    findOptionGroupById: jest.fn().mockResolvedValue(aGroup()),
    findOptionGroupsByIds: jest.fn().mockResolvedValue([]),
    listOptionGroups: jest.fn().mockResolvedValue([]),
  };
  optionGroupRepositoryWrite = {
    createOptionGroup: jest.fn(async (group) => ({ ...group })),
    updateOptionGroupById: jest.fn(async (id, fields) => ({
      ...aGroup({ id }),
      ...fields,
    })),
    deleteOptionGroupById: jest.fn().mockResolvedValue(true),
    setOptionAvailability: jest.fn().mockResolvedValue(aGroup()),
  };
  optionGroupUsage = {
    countProductsUsingOptionGroup: jest.fn().mockResolvedValue(0),
  };
  optionGroupService = new OptionGroupService({
    optionGroupRepositoryRead,
    optionGroupRepositoryWrite,
    optionGroupUsage,
    clock,
  });
});

describe('When we create an option group', () => {
  it('should generate option ids and default availability', async () => {
    const group = await optionGroupService.createOptionGroup(GROUP_DATA);

    expect(group.options).toEqual([
      expect.objectContaining({ name: 'Bacon', isAvailable: true }),
      expect.objectContaining({ name: 'Cheddar', isAvailable: false }),
    ]);
    expect(group.options[0].id).toEqual(expect.any(String));
  });

  it('should reject invalid min/max combinations (OPT-R01)', async () => {
    await expect(
      optionGroupService.createOptionGroup({
        ...GROUP_DATA,
        minSelections: 4,
      }),
    ).rejects.toMatchObject({ code: 'INVALID_SELECTION_RANGE' });
  });
});

describe('When we update an option group', () => {
  it('should keep the ids of existing options and create new ones', async () => {
    const group = await optionGroupService.updateOptionGroup({
      ...GROUP_DATA,
      id: 'group-1',
      options: [
        { id: 'bacon', name: 'Bacon', priceInCents: 500 },
        { id: 'forged', name: 'Ovo', priceInCents: 200 },
      ],
    });

    expect(group.options[0]).toMatchObject({ id: 'bacon', priceInCents: 500 });
    expect(group.options[1].id).not.toBe('forged');
  });
});

describe('When we delete an option group', () => {
  it('should block a group linked to products (OPT-R04)', async () => {
    optionGroupUsage.countProductsUsingOptionGroup.mockResolvedValue(1);

    await expect(
      optionGroupService.deleteOptionGroup('group-1'),
    ).rejects.toMatchObject({ code: 'OPTION_GROUP_IN_USE' });
  });

  it('should delete an unused group', async () => {
    await optionGroupService.deleteOptionGroup('group-1');

    expect(
      optionGroupRepositoryWrite.deleteOptionGroupById,
    ).toHaveBeenCalledWith('group-1');
  });
});

describe('When we toggle an option as sold out', () => {
  it('should update the option availability', async () => {
    await optionGroupService.setOptionAvailability({
      optionGroupId: 'group-1',
      optionId: 'bacon',
      isAvailable: false,
    });

    expect(
      optionGroupRepositoryWrite.setOptionAvailability,
    ).toHaveBeenCalledWith('group-1', 'bacon', false);
  });

  it('should throw NotFoundError for an unknown option', async () => {
    await expect(
      optionGroupService.setOptionAvailability({
        optionGroupId: 'group-1',
        optionId: 'missing',
        isAvailable: false,
      }),
    ).rejects.toThrow(NotFoundError);
  });

  it('should not query the database for an empty id list', async () => {
    await expect(optionGroupService.findOptionGroupsByIds([])).resolves.toEqual(
      [],
    );
    expect(
      optionGroupRepositoryRead.findOptionGroupsByIds,
    ).not.toHaveBeenCalled();
  });
});
