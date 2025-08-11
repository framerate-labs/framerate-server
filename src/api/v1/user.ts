import Elysia, { t } from "elysia";

import { auth } from "@/lib/auth";
import { betterAuth } from "@/middlewares/auth-middleware";
import { getListData, trackUniqueView } from "@/services/v1/lists";

export const user = new Elysia({ name: "user", prefix: "/user" })
  .use(betterAuth)
  // Allows list queries when ID is unknown (navigating directly to list page
  // from URL or bookmark)
  .get(
    "/:username/lists/:slug",
    async ({ server, request, headers, params: { username, slug } }) => {
      const reqHeaders = headers as any as Headers;
      const session = await auth.api.getSession({ headers: reqHeaders });
      const results = await getListData(username, slug, session?.user);

      const listId = results.list.id;
      const ip = server?.requestIP(request);

      if (ip) {
        trackUniqueView(listId, ip.address, session?.user.id)
          .then((viewResult) => {
            if (!viewResult.success) {
              console.warn("Failed to track view for list:", listId);
            }
          })
          .catch((error) => {
            console.error("Unhandled error while tracking list view", error);
          });
      }

      return results;
    },
    {
      params: t.Object({
        username: t.String(),
        slug: t.String(),
      }),
    },
  );
