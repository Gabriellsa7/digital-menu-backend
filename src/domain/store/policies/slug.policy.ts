import { normalizeText } from '../../common/normalize-text';
import { BusinessRuleError } from '../../errors/business-rule.error';

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 40;
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  'entrar',
  'pedidos',
  'perfil',
  'checkout',
  'sacola',
  'busca',
  'lojas',
  'cadastro',
  'login',
  'logout',
  'conta',
  'ajuda',
  'termos',
  'privacidade',
  'api',
  'admin',
  'app',
  'static',
  '_next',
  'favicon.ico',
  'robots.txt',
  'sitemap.xml',
]);

export function assertValidSlug(slug: string): void {
  const hasValidLength =
    slug.length >= SLUG_MIN_LENGTH && slug.length <= SLUG_MAX_LENGTH;
  if (!hasValidLength || !SLUG_PATTERN.test(slug)) {
    throw new BusinessRuleError(
      `Slug must have ${SLUG_MIN_LENGTH}-${SLUG_MAX_LENGTH} lowercase letters, numbers, and single hyphens`,
      'INVALID_SLUG',
    );
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new BusinessRuleError(`Slug "${slug}" is reserved`, 'SLUG_RESERVED');
  }
}

export function slugify(name: string): string {
  const slug = normalizeText(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, '');
  const padded = slug.length >= SLUG_MIN_LENGTH ? slug : `${slug}-loja`;
  const withoutEdgeHyphens = padded.replace(/^-+/g, '');
  return RESERVED_SLUGS.has(withoutEdgeHyphens)
    ? `${withoutEdgeHyphens}-loja`
    : withoutEdgeHyphens;
}

export async function findAvailableSlug(
  base: string,
  isTaken: (slug: string) => Promise<boolean>,
): Promise<string> {
  for (let attempt = 1; ; attempt += 1) {
    const suffix = attempt === 1 ? '' : `-${attempt}`;
    const candidate = `${base.slice(0, SLUG_MAX_LENGTH - suffix.length).replace(/-+$/g, '')}${suffix}`;
    if (!(await isTaken(candidate))) {
      return candidate;
    }
  }
}
