import "dotenv/config";

import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";

import { api } from "@/api/api-index";
import { rateLimit } from "elysia-rate-limit";

let allowedOrigins: string[] = [];

if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);
}

if (process.env.NODE_ENV === "development" && process.env.DEV_ORIGIN) {
  allowedOrigins.push(process.env.DEV_ORIGIN);
}

const app = new Elysia()
  .use(swagger())
  .use(
    rateLimit({
      max: 100,
      errorResponse:
        "You have made too many requests. Please wait one minute before making another request.",
      scoping: "global",
    }),
  )
  .use(
    cors({
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  )
  .use(api)
  .listen(8000);

export type App = typeof app;

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`,
);
