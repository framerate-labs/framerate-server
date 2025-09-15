import Elysia, { t } from "elysia";

import { auth } from "@/lib/auth";
import { betterAuth } from "@/middlewares/auth-middleware";
import { getListData, getListsByUsername, trackUniqueView } from "@/services/v1/lists";

export const user = new Elysia({ name: "user", prefix: "/user" })
  .use(betterAuth)

  /**
   * GET /user/:username/lists
   *
   * Public endpoint to fetch all lists for a given username.
   *
   * Behavior & security:
   * - No authentication required
   * - Stable response shape: `{ data, error: null }`
   *
   * Status codes:
   * - 200 on success
   * - 404 if the user does not exist
   *
   * @param username - The user's username
   * @returns `{ data: List[], error: null }`
   */
  .get(
    "/:username/lists",
    async ({ params: { username }, set }) => {
      const results = await getListsByUsername(username);
      set.status = 200;
      return { data: results, error: null };
    },
    {
      params: t.Object({
        username: t.String(),
      }),
    },
  )

  /**
   * GET /user/:username/lists/:slug
   *
   * Public endpoint to fetch a list by `username` and `slug` for deep links/bookmarks.
   * If a session cookie is present, viewer-specific flags (liked/saved) are included.
   * Also attempts to record a unique view (per userId/IP within 24h) without blocking the response.
   *
   * Behavior & security:
   * - No authentication required
   * - Session is derived from the incoming request headers if present
   * - View tracking is best-effort and does not expose PII (IP is hashed in the service)
   *
   * Status codes:
   * - 200 on success
   * - 404 if the list does not exist (thrown by service)
   *
   * @param username - Owner's username
   * @param slug     - List slug
   * @returns `{ data: { list, isLiked, isSaved, listItems }, error: null }`
   */
  .get(
    "/:username/lists/:slug",
    async ({ server, request, params: { username, slug }, set }) => {
      const session = await auth.api.getSession({ headers: request.headers });

      const results = await getListData(username, slug, session?.user);

      // Best-effort unique view tracking; do not delay response.
      const listId = results.list.id;
      const ipInfo = server?.requestIP(request);
      const ipAddress = ipInfo?.address ?? null;

      if (ipAddress) {
        // Fire-and-forget with robust error handling.
        // (Intentionally not awaited to keep request latency low.)
        trackUniqueView(listId, ipAddress, session?.user?.id).catch((err) => {
          console.error("Unhandled error while tracking list view", {
            listId,
            err,
          });
        });
      }

      set.status = 200;
      return { data: results, error: null };
    },
    {
      params: t.Object({
        username: t.String(),
        slug: t.String(),
      }),
    },
  );
