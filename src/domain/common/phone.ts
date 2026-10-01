const BRAZIL_COUNTRY_CODE = '55';
// DDD (2 digits, no leading zero) + mobile number (9 + 8 digits)
const BRAZILIAN_MOBILE_PATTERN = /^[1-9]{2}9\d{8}$/;

/**
 * Normalizes a Brazilian mobile phone to E.164 (`+5511999998888`).
 * Accepts any formatting (`(11) 99999-8888`, `+55 11 99999-8888`...).
 * @returns The E.164 phone, or undefined when it is not a valid BR mobile
 */
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
