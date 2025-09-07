export class HttpError extends Error {
  constructor(
    public status: number,
    public publicMessage: string,
    public details?: unknown,
    options?: { cause?: unknown },
  ) {
    super(publicMessage, options);
    this.name = "HttpError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// Ergonomic helper (typed as never)
export function httpError(status: number, publicMessage: string): never;
export function httpError(
  status: number,
  publicMessage: string,
  details: unknown,
): never;
export function httpError(
  status: number,
  publicMessage: string,
  details?: unknown,
): never {
  throw new HttpError(status, publicMessage, details);
}
