import { IClock } from '../../domain/common/clock.interface';

export class SystemClock implements IClock {
  now(): Date {
    return new Date();
  }
}
