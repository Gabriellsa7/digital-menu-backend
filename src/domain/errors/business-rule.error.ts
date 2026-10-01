import { DomainError } from './domain.error';

export class BusinessRuleError extends DomainError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message, 422, code, details);
  }
}
