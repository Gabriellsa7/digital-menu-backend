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
