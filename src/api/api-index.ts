import { Elysia } from "elysia";

import { betterAuth } from "@/middlewares/auth-middleware";
import { v1 } from "./v1/v1-index";
import { betterAuthHandler } from "./better-auth";

export const api = new Elysia({ name: "apiIndex", prefix: "/api" })
  .use(betterAuthHandler)
  .use(betterAuth)
  .use(v1);
