import { auth } from "@/lib/auth";
import { errorPlugin } from "@/plugins/error-plugin";
import { Elysia } from "elysia";

export const betterAuth = new Elysia({ name: "better-auth" })
  .use(errorPlugin)
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ httpError, request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) {
          httpError(401, "Unauthorized Access: Invalid Session");
        }

        // httpError throws, so session is guaranteed to be non-null here
        return {
          user: session!.user,
          session: session!.session,
        };
      },
    },
  });
