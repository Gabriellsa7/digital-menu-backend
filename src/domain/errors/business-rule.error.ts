import { DomainError } from './domain.error';

/**
 * A request that is well-formed but breaks a business rule (store closed,
 * address limit reached...). Always carries a `code` from the business rules
 * doc so the front end can react without parsing the message.
 */
export class BusinessRuleError extends DomainError {
  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message, 422, code, details);
  }
}
