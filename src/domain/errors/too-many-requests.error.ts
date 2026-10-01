import { DomainError } from './domain.error';

export class TooManyRequestsError extends DomainError {
  public readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number, code?: string) {
    super(message, 429, code, { retryAfterSeconds });
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
