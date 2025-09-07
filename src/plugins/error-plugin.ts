import { Elysia } from "elysia";
import { HttpError } from "@/lib/httpError";

export const errorPlugin = new Elysia({ name: "error-plugin" })
  .decorate(
    "httpError",
    (status: number, publicMessage: string, details?: unknown): never => {
      throw new HttpError(status, publicMessage, details);
    },
  )
  .derive(({ request }) => {
    const requestId =
      request.headers.get("x-request-id") ?? crypto.randomUUID();
    return { requestId };
  })
  .onAfterHandle(({ response, requestId, request }) => {
    // leave error envelopes untouched
    if (
      response &&
      typeof response === "object" &&
      "error" in (response as any)
    )
      return response;
    // do not wrap native Response or streams
    if (response instanceof Response) return response;
    if ((response as any)?.pipe || (response as any)?.[Symbol.asyncIterator])
      return response;
    // HEAD must not have a body
    if (request.method === "HEAD") return new Response(null, { status: 200 });

    return { data: response ?? null, meta: { requestId } };
  })
  .onError(({ code, error, set, request, path, requestId }) => {
    set.headers["content-type"] = "application/json; charset=utf-8";

    let status = 500;
    let message = "Internal server error";
    let details: unknown;

    if (code === "VALIDATION") {
      status = 422;
      message = "Request validation failed";
      details = (error as any)?.errors ?? (error as any)?.validator;
    } else if (code === "NOT_FOUND") {
      status = 404;
      message = "Route not found";
    } else if (error instanceof HttpError) {
      status = error.status;
      message = status >= 500 ? "Internal server error" : error.publicMessage;
      details = status >= 500 ? undefined : error.details;
    } else if (typeof (error as any)?.status === "number") {
      status = (error as any).status;
      const msg = (error as any).message;
      message =
        status >= 500
          ? "Internal server error"
          : typeof msg === "string" && msg
            ? msg
            : "Request failed";
    }

    // Never include details on 5xx responses
    if (status >= 500) details = undefined;

    set.status = status;

    console.error(
      JSON.stringify({
        level: "error",
        requestId,
        path,
        method: request.method,
        status,
        code,
        msg: (error as any)?.message,
        stack:
          process.env.NODE_ENV === "production"
            ? undefined
            : (error as any)?.stack,
      }),
    );

    return { error: { message, details }, meta: { requestId } };
  });

export type ErrorPlugin = typeof errorPlugin;
