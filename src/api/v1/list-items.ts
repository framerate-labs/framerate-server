import { betterAuth } from "@/middlewares/auth-middleware";
import { httpError } from "@/lib/httpError";
import { addListItem, deleteListItem, getListItem } from "@/services/v1/lists";
import Elysia, { t } from "elysia";

export const listItems = new Elysia({
  name: "list-items",
})
  .use(betterAuth)

  /**
   * GET /list-items
   *
   * Returns the authenticated user's list item for a given media (if any).
   *
   * - Requires authentication
   * - Responds with `{ data: null }` if the user hasn't saved this media to any list
   *
   * @query mediaType - "movie" | "tv"
   * @query mediaId   - TMDB media ID
   * @returns `{ data: { listId, listItemId, mediaType, mediaId } | null, error: null }`
   */
  .get(
    "/list-items",
    async ({ user, query: { mediaType, mediaId }, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const result = await getListItem(user.id, mediaId, mediaType);

      set.status = 200;
      return {
        data: result ?? null,
        error: null,
      };
    },
    {
      auth: true,
      query: t.Object({
        mediaId: t.Number(),
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
      }),
    },
  )

  /**
   * POST /list-items
   *
   * Adds a media item (movie/tv) to one of the authenticated user's lists.
   *
   * Security & behavior:
   * - Requires authentication
   * - **Ownership enforced server-side**: `listId` must belong to the caller
   * - **Idempotent**: re-adding the same media returns the existing row
   *
   * Status codes:
   * - 201 when a new item is created
   * - 200 when the item already existed
   *
   * @body listId    - The user's list ID
   * @body mediaType - "movie" | "tv"
   * @body mediaId   - TMDB media ID
   * @returns `{ data: { created: boolean, item: {...} }, error: null }`
   */
  .post(
    "/list-items",
    async ({ user, body, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const { listId, mediaType, mediaId } = body;

      const result = await addListItem({
        listId,
        mediaType,
        movieId: mediaType === "movie" ? mediaId : null,
        seriesId: mediaType === "tv" ? mediaId : null,
        userId: user.id,
      });

      if (!result) {
        throw httpError(500, "Failed to add list item! Please try again later");
      }

      set.status = result.created ? 201 : 200;
      return {
        data: result,
        error: null,
      };
    },
    {
      auth: true,
      body: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        listId: t.Number(),
        mediaId: t.Number(),
      }),
    },
  )

  /**
   * DELETE /list-items/:id
   *
   * Removes a media item from the authenticated user's list.
   *
   * Security & behavior:
   * - Requires authentication
   * - Deletes only if the `list_item.userId` matches the caller
   *
   * Status codes:
   * - 200 with `{ data: null }` on success
   * - 404 if the list item does not exist or does not belong to the user
   *
   * @param id - The `listItemId` to remove
   * @returns `{ data: null, error: null }`
   */
  .delete(
    "/list-items/:id",
    async ({ user, params: { id: listItemId }, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const result = await deleteListItem(user.id, listItemId);

      if (!result) {
        throw httpError(404, "List item not found");
      }

      set.status = 200;
      return {
        data: null,
        error: null,
      };
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
    },
  );
