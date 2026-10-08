import { OptionGroup } from '../../domain/option-group/option-group.entity';
import { IOptionGroup } from '../../domain/option-group/interfaces/option-group.interface';

function anOption(name: string) {
  return { id: name, name, priceInCents: 0, isAvailable: true };
}

function aGroup(overrides: Partial<IOptionGroup> = {}): IOptionGroup {
  return {
    id: 'group-1',
    storeId: 'store-1',
    name: 'Pão',
    minSelections: 1,
    maxSelections: 1,
    allowRepeat: false,
    options: [anOption('Brioche'), anOption('Australiano')],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('When we build an option group', () => {
  it('should accept a valid required radio group', () => {
    const group = new OptionGroup(aGroup());

    expect(group.isRequired()).toBe(true);
  });

  it.each([
    ['min above max', { minSelections: 2, maxSelections: 1 }],
    ['negative min', { minSelections: -1 }],
    ['max zero', { minSelections: 0, maxSelections: 0 }],
  ])('should reject %s (OPT-R01)', (_case, overrides) => {
    expect(() => new OptionGroup(aGroup(overrides))).toThrow(
      expect.objectContaining({ code: 'INVALID_SELECTION_RANGE' }),
    );
  });

  it('should reject max above the options without repeats (OPT-R02)', () => {
    expect(
      () => new OptionGroup(aGroup({ minSelections: 0, maxSelections: 3 })),
    ).toThrow(expect.objectContaining({ code: 'MAX_SELECTIONS_ABOVE_OPTIONS' }));
  });

  it('should allow max above the options with repeats (OPT-R02)', () => {
    expect(
      () =>
        new OptionGroup(
          aGroup({ minSelections: 0, maxSelections: 5, allowRepeat: true }),
        ),
    ).not.toThrow();
  });

  it('should reject a group without options (OPT-R03)', () => {
    expect(() => new OptionGroup(aGroup({ options: [] }))).toThrow(
      expect.objectContaining({ code: 'OPTION_GROUP_EMPTY' }),
    );
  });

  it('should reject duplicated option names ignoring casing (OPT-R03)', () => {
    expect(
      () =>
        new OptionGroup(
          aGroup({
            options: [anOption('Bacon'), { ...anOption(' bacon '), id: 'x' }],
          }),
        ),
    ).toThrow(expect.objectContaining({ code: 'DUPLICATED_OPTION_NAME' }));
  });

  it('should throw NotFoundError for an unknown option', () => {
    expect(() => new OptionGroup(aGroup()).findOption('missing')).toThrow(
      'Option not found',
    );
  });
});
