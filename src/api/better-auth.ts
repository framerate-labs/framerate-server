import { Elysia } from "elysia";
import { auth } from "@/lib/auth";

export const betterAuthHandler = new Elysia({ prefix: "/auth" })
  // Delegate error shaping to global handler; just ensure no sensitive leak
  .onError(({ error, set }) => {
    console.error("Error in auth route:", error);
    set.status = 500;
    return { error: { message: "Failed to activate session" } };
  })
  .mount("*", async (request: Request) => await auth.handler(request));
