import {
  assertValidOpeningHours,
  currentIntervalEnd,
  isOpenAt,
  nextBoundaryAfter,
  nextOpeningAt,
} from '../../domain/store/policies/opening-hours.policy';
import {
  EWeekday,
  IOpeningHour,
} from '../../domain/store/interfaces/store.interface';

const TIMEZONE = 'America/Sao_Paulo';

const SCHEDULE: IOpeningHour[] = [
  { weekday: EWeekday.THURSDAY, opensAt: '11:00', closesAt: '14:00' },
  { weekday: EWeekday.THURSDAY, opensAt: '18:00', closesAt: '23:00' },
  { weekday: EWeekday.FRIDAY, opensAt: '18:00', closesAt: '02:00' },
];

function local(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

describe('When we check whether the store is open (STO-R02, R03)', () => {
  it.each([
    ['Thursday before lunch', '2026-10-01T10:59', false],
    ['Thursday lunch opening minute', '2026-10-01T11:00', true],
    ['Thursday lunch closing minute', '2026-10-01T14:00', false],
    ['Thursday between intervals', '2026-10-01T16:00', false],
    ['Thursday dinner', '2026-10-01T22:59', true],
    ['Friday night', '2026-10-02T23:30', true],
    ['Saturday 01:00, inside the Friday interval', '2026-10-03T01:00', true],
    ['Saturday 02:00, after the Friday interval', '2026-10-03T02:00', false],
    ['Sunday without hours', '2026-10-04T12:00', false],
  ])('should be %s → %s', (_case, iso, expected) => {
    expect(isOpenAt(SCHEDULE, TIMEZONE, local(iso))).toBe(expected);
  });

  it('should use the store timezone, not UTC', () => {
    const utcNoon = new Date('2026-10-01T12:00:00Z');

    expect(isOpenAt(SCHEDULE, TIMEZONE, utcNoon)).toBe(false);
    expect(isOpenAt(SCHEDULE, 'UTC', utcNoon)).toBe(true);
  });
});

describe('When we compute the next boundaries', () => {
  it('should return the end of the current interval, across midnight', () => {
    expect(
      currentIntervalEnd(SCHEDULE, TIMEZONE, local('2026-10-02T23:00')),
    ).toEqual(local('2026-10-03T02:00'));
  });

  it('should return the next opening on the same day', () => {
    expect(nextOpeningAt(SCHEDULE, TIMEZONE, local('2026-10-01T15:00'))).toEqual(
      local('2026-10-01T18:00'),
    );
  });

  it('should skip days without hours', () => {
    expect(nextOpeningAt(SCHEDULE, TIMEZONE, local('2026-10-03T03:00'))).toEqual(
      local('2026-10-08T11:00'),
    );
  });

  it('should return undefined without any hours', () => {
    expect(nextOpeningAt([], TIMEZONE, local('2026-10-01T15:00'))).toBe(
      undefined,
    );
  });

  it('should pick the closest boundary, open or close', () => {
    expect(
      nextBoundaryAfter(SCHEDULE, TIMEZONE, local('2026-10-01T12:00')),
    ).toEqual(local('2026-10-01T14:00'));
    expect(
      nextBoundaryAfter(SCHEDULE, TIMEZONE, local('2026-10-01T15:00')),
    ).toEqual(local('2026-10-01T18:00'));
  });
});

describe('When we validate the opening hours (STO-R04)', () => {
  it('should accept several intervals on the same day', () => {
    expect(() => assertValidOpeningHours(SCHEDULE)).not.toThrow();
  });

  it.each([
    [
      'overlapping on the same day',
      [
        { weekday: EWeekday.MONDAY, opensAt: '11:00', closesAt: '15:00' },
        { weekday: EWeekday.MONDAY, opensAt: '14:00', closesAt: '18:00' },
      ],
    ],
    [
      'a midnight crossing over the next day',
      [
        { weekday: EWeekday.MONDAY, opensAt: '18:00', closesAt: '03:00' },
        { weekday: EWeekday.TUESDAY, opensAt: '02:00', closesAt: '05:00' },
      ],
    ],
    [
      'Saturday night over Sunday morning',
      [
        { weekday: EWeekday.SATURDAY, opensAt: '20:00', closesAt: '04:00' },
        { weekday: EWeekday.SUNDAY, opensAt: '03:00', closesAt: '06:00' },
      ],
    ],
  ])('should reject intervals %s', (_case, hours) => {
    expect(() => assertValidOpeningHours(hours)).toThrow(
      expect.objectContaining({ code: 'OVERLAPPING_HOURS' }),
    );
  });

  it.each([
    ['opening and closing at the same time', '10:00', '10:00'],
    ['an invalid time', '25:00', '10:00'],
  ])('should reject %s', (_case, opensAt, closesAt) => {
    expect(() =>
      assertValidOpeningHours([
        { weekday: EWeekday.MONDAY, opensAt, closesAt },
      ]),
    ).toThrow(expect.objectContaining({ code: 'INVALID_HOURS' }));
  });
});
