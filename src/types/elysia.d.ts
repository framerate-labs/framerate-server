import "elysia";

declare module "elysia" {
  interface Context {
    requestId: string;
    httpError: (
      status: number,
      publicMessage: string,
      details?: unknown,
    ) => never;
  }
}
