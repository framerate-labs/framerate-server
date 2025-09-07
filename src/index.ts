import "dotenv/config";
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { rateLimit } from "elysia-rate-limit";

import { api } from "@/api/api-index";
import { errorPlugin } from "@/plugins/error-plugin";

const allowedOrigins = ["https://www.frame-rate.io", "https://frame-rate.io"];
if (process.env.NODE_ENV === "development" && process.env.DEV_ORIGIN) {
  allowedOrigins.push("http://192.168.5.6", process.env.DEV_ORIGIN);
}

// Non-spoofable client IP for rate limiting
const socketIp = (request: Request, server: Elysia["server"]) =>
  server?.requestIP(request)?.address ?? "unknown";

const app = new Elysia()
  .use(errorPlugin)

  // Security headers
  .onBeforeHandle(({ set }) => {
    set.headers["x-content-type-options"] = "nosniff";
    set.headers["x-frame-options"] = "DENY";
    set.headers["referrer-policy"] = "no-referrer";
    if (process.env.NODE_ENV === "production") {
      set.headers["strict-transport-security"] =
        "max-age=31536000; includeSubDomains; preload";
    }
  })

  // Write rate limit (skip health)
  .use(
    rateLimit({
      duration: 60_000,
      max: 30,
      scoping: "scoped",
      generator: (req, server) => `write:${socketIp(req, server)}`,
      skip: (req) => {
        const path = new URL(req.url).pathname;
        return (
          req.method === "GET" || req.method === "OPTIONS" || path === "/health"
        );
      },
      headers: true,
      countFailedRequest: true,
      errorResponse: new Response(
        JSON.stringify({
          error: { message: "Too many write requests. Please slow down." },
        }),
        { status: 429, headers: { "content-type": "application/json" } },
      ),
    }),
  )

  // Read rate limit (skip health)
  .use(
    rateLimit({
      duration: 60_000,
      max: 120,
      scoping: "scoped",
      generator: (req, server) => `read:${socketIp(req, server)}`,
      skip: (req) => {
        const path = new URL(req.url).pathname;
        return req.method !== "GET" || path === "/health";
      },
      headers: true,
      countFailedRequest: false,
      errorResponse: new Response(
        JSON.stringify({
          error: { message: "Too many requests. Try again soon." },
        }),
        { status: 429, headers: { "content-type": "application/json" } },
      ),
    }),
  )

  // CORS
  .use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )

  // Routes
  .use(api)

  // Health check
  .get("/health", () => "ok");

// Swagger only in dev (register BEFORE listen)
if (process.env.NODE_ENV !== "production") {
  app.use(swagger());
}

app.listen({ port: 8000, hostname: "0.0.0.0" });

export type App = typeof app;

console.log(`🦊 Elysia running at ${app.server?.hostname}:${app.server?.port}`);
