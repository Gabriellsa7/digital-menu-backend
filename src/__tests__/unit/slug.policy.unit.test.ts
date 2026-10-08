import {
  assertValidSlug,
  findAvailableSlug,
  slugify,
} from '../../domain/store/policies/slug.policy';

describe('When we validate a store slug (TEN-R01)', () => {
  it.each(['casa-brasa', 'pizza123', 'a1b', 'x'.repeat(40)])(
    'should accept "%s"',
    (slug) => {
      expect(() => assertValidSlug(slug)).not.toThrow();
    },
  );

  it.each([
    'ab',
    'x'.repeat(41),
    'Casa-Brasa',
    'casa brasa',
    '-casa',
    'casa-',
    'casa--brasa',
    'café',
  ])('should reject "%s" with INVALID_SLUG', (slug) => {
    expect(() => assertValidSlug(slug)).toThrow(
      expect.objectContaining({ code: 'INVALID_SLUG' }),
    );
  });

  it.each(['entrar', 'pedidos', 'checkout', 'admin'])(
    'should reject the reserved slug "%s"',
    (slug) => {
      expect(() => assertValidSlug(slug)).toThrow(
        expect.objectContaining({ code: 'SLUG_RESERVED' }),
      );
    },
  );
});

describe('When we derive a slug from a store name', () => {
  it.each([
    ['Casa Brasa', 'casa-brasa'],
    ['  Pizzaria  São João! ', 'pizzaria-sao-joao'],
    ["Burger & Co.", 'burger-co'],
    ['A', 'a-loja'],
    ['Pedidos', 'pedidos-loja'],
    ['!!!', 'loja'],
  ])('should turn "%s" into "%s"', (name, expected) => {
    const slug = slugify(name);

    expect(slug).toBe(expected);
    expect(() => assertValidSlug(slug)).not.toThrow();
  });

  it('should never be longer than the maximum length', () => {
    const slug = slugify('Restaurante '.repeat(10));

    expect(slug.length).toBeLessThanOrEqual(40);
    expect(() => assertValidSlug(slug)).not.toThrow();
  });
});

describe('When we look for a free slug', () => {
  it('should keep the base slug when it is free', async () => {
    await expect(
      findAvailableSlug('casa-brasa', async () => false),
    ).resolves.toBe('casa-brasa');
  });

  it('should append -2, -3… until the slug is free', async () => {
    const taken = new Set(['casa-brasa', 'casa-brasa-2']);

    await expect(
      findAvailableSlug('casa-brasa', async (slug) => taken.has(slug)),
    ).resolves.toBe('casa-brasa-3');
  });

  it('should cut a long base so the suffix still fits', async () => {
    const base = 'x'.repeat(40);

    const slug = await findAvailableSlug(base, async (s) => s === base);

    expect(slug).toBe(`${'x'.repeat(38)}-2`);
  });
});
