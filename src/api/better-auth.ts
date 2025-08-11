import { Elysia } from "elysia";
import { auth } from "@/lib/auth";

export const betterAuthHandler = new Elysia({ prefix: "/auth" })
  .onError(({ error }) => {
    console.error("Error in auth route:", error);
    return {
      status: 500,
      message: "Something went wrong while activating your session!",
      error: error,
    };
  })
  .mount("*", async (request: Request) => await auth.handler(request));
