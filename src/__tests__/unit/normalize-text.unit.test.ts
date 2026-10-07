import { normalizeText } from '../../domain/common/normalize-text';

describe('When we normalize a neighborhood name', () => {
  it.each([
    ['Vila Mariana', 'vila mariana'],
    ['  vila   mariána ', 'vila mariana'],
    ['SÃO PAULO', 'sao paulo'],
    ['Jardim Paulistânia', 'jardim paulistania'],
  ])('should turn "%s" into "%s"', (input, expected) => {
    expect(normalizeText(input)).toBe(expected);
  });
});
