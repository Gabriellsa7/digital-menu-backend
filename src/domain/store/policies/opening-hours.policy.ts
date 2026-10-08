import { DateTime } from 'luxon';
import { BusinessRuleError } from '../../errors/business-rule.error';
import { IOpeningHour } from '../interfaces/store.interface';

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;
const DAYS_TO_SEARCH = 8;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

interface IWeeklyInterval {
  start: number;
  end: number;
}

function toMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time);
  if (!match) {
    throw new BusinessRuleError(`Invalid time "${time}"`, 'INVALID_HOURS');
  }
  return Number(match[1]) * 60 + Number(match[2]);
}

function durationInMinutes({ opensAt, closesAt }: IOpeningHour): number {
  const opens = toMinutes(opensAt);
  const closes = toMinutes(closesAt);
  return closes > opens ? closes - opens : MINUTES_PER_DAY - opens + closes;
}

function toWeeklyInterval(hour: IOpeningHour): IWeeklyInterval {
  const start = hour.weekday * MINUTES_PER_DAY + toMinutes(hour.opensAt);
  return { start, end: start + durationInMinutes(hour) };
}

function intervalsAround(
  openingHours: IOpeningHour[],
  timezone: string,
  date: Date,
): { opensAt: DateTime; closesAt: DateTime }[] {
  const localNow = DateTime.fromJSDate(date, { zone: timezone });
  const intervals = [];
  for (let offset = -1; offset < DAYS_TO_SEARCH; offset += 1) {
    const day = localNow.startOf('day').plus({ days: offset });
    const weekday = day.weekday % 7;
    for (const hour of openingHours.filter((h) => h.weekday === weekday)) {
      const opensAt = day.plus({ minutes: toMinutes(hour.opensAt) });
      intervals.push({
        opensAt,
        closesAt: opensAt.plus({ minutes: durationInMinutes(hour) }),
      });
    }
  }
  return intervals.sort((a, b) => a.opensAt.toMillis() - b.opensAt.toMillis());
}

export function currentIntervalEnd(
  openingHours: IOpeningHour[],
  timezone: string,
  date: Date,
): Date | undefined {
  const now = date.getTime();
  const current = intervalsAround(openingHours, timezone, date).find(
    ({ opensAt, closesAt }) =>
      opensAt.toMillis() <= now && now < closesAt.toMillis(),
  );
  return current?.closesAt.toJSDate();
}

export function isOpenAt(
  openingHours: IOpeningHour[],
  timezone: string,
  date: Date,
): boolean {
  return currentIntervalEnd(openingHours, timezone, date) !== undefined;
}

export function nextOpeningAt(
  openingHours: IOpeningHour[],
  timezone: string,
  date: Date,
): Date | undefined {
  const next = intervalsAround(openingHours, timezone, date).find(
    ({ opensAt }) => opensAt.toMillis() > date.getTime(),
  );
  return next?.opensAt.toJSDate();
}

export function nextBoundaryAfter(
  openingHours: IOpeningHour[],
  timezone: string,
  date: Date,
): Date | undefined {
  const boundaries = [
    currentIntervalEnd(openingHours, timezone, date),
    nextOpeningAt(openingHours, timezone, date),
  ].filter((boundary): boundary is Date => boundary !== undefined);
  if (boundaries.length === 0) {
    return undefined;
  }
  return new Date(Math.min(...boundaries.map((b) => b.getTime())));
}

export function assertValidOpeningHours(openingHours: IOpeningHour[]): void {
  openingHours.forEach(({ opensAt, closesAt }) => {
    if (toMinutes(opensAt) === toMinutes(closesAt)) {
      throw new BusinessRuleError(
        'An interval cannot open and close at the same time',
        'INVALID_HOURS',
      );
    }
  });

  const intervals = openingHours
    .map(toWeeklyInterval)
    .sort((a, b) => a.start - b.start);
  intervals.forEach((interval, index) => {
    const next = intervals[(index + 1) % intervals.length];
    const nextStart =
      index + 1 < intervals.length ? next.start : next.start + MINUTES_PER_WEEK;
    if (intervals.length > 1 && interval.end > nextStart) {
      throw new BusinessRuleError(
        'Opening hours overlap',
        'OVERLAPPING_HOURS',
      );
    }
  });
}
