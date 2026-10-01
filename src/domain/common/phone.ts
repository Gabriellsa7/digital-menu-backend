const BRAZIL_COUNTRY_CODE = '55';
const BRAZILIAN_MOBILE_PATTERN = /^[1-9]{2}9\d{8}$/;

export function normalizeBrazilianMobile(input: string): string | undefined {
  let digits = input.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith(BRAZIL_COUNTRY_CODE)) {
    digits = digits.slice(BRAZIL_COUNTRY_CODE.length);
  }
  if (!BRAZILIAN_MOBILE_PATTERN.test(digits)) {
    return undefined;
  }
  return `+${BRAZIL_COUNTRY_CODE}${digits}`;
}
