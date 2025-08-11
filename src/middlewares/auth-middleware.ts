import { auth } from "@/lib/auth";
import { Elysia } from "elysia";

export const betterAuth = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ error, request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) return error(401, "Unauthorized Access: Invalid Session");

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
  });
