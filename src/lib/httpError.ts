// src/lib/httpError.ts
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    // restore prototype chain
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

// convenience
export function httpError(status: number, message: string): never {
  throw new HttpError(status, message);
}
