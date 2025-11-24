import { Elysia } from "elysia";
import { auth } from "@/lib/auth";

export const betterAuthHandler = new Elysia({ prefix: "/auth" })
  .get("/me", async ({ request, set }) => {
    const session = await auth.api.getSession(request); // Use the available auth instance

    if (!session?.user) {
      set.status = 401; // Unauthorized
      return { error: "No active session" };
    }

    return { userId: session.user.id };
  })
  // Delegate error shaping to global handler; just ensure no sensitive leak
  .onError(({ error, set }) => {
    console.error("Error in auth route:", error);
    set.status = 500;
    return { error: { message: "Failed to activate session" } };
  })
  .mount("*", async (request: Request) => await auth.handler(request));
