import { IClock } from '../../domain/common/clock.interface';

export class FixedClock implements IClock {
  private current: Date;

  constructor(isoDate = '2026-10-01T12:00:00.000Z') {
    this.current = new Date(isoDate);
  }

  now(): Date {
    return new Date(this.current);
  }

  advanceSeconds(seconds: number): void {
    this.current = new Date(this.current.getTime() + seconds * 1000);
  }
}
