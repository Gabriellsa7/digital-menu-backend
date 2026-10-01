/**
 * Base class for business errors. The HTTP status carried here is mapped to the
 * response by the global error handler in `interfaces/http/server.ts` — services
 * and controllers never translate errors to status codes themselves.
 *
 * `code` is a stable, machine-readable reason (e.g. `ADDRESS_LIMIT_REACHED`)
 * the front ends use to pick the right UX; `details` carries extra context.
 */
export class DomainError extends Error {
  public readonly status: number;

  public readonly code?: string;

  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    status = 500,
    code?: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
