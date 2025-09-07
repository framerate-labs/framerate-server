import { betterAuth } from "@/middlewares/auth-middleware";
import { httpError } from "@/lib/httpError";
import {
  addListAction,
  deleteListAction,
  updateReview,
} from "@/services/v1/actions";
import Elysia, { t } from "elysia";

export const actions = new Elysia({ name: "actions" })
  .use(betterAuth)

  /**
   * PATCH /actions/media
   *
   * Updates a review field ("liked" or "watched") for a movie or TV show.
   *
   * - Requires authentication
   * - If the review exists, it is updated
   * - If no review exists, responds with 404
   *
   * @body mediaType - "movie" or "tv"
   * @body mediaId   - TMDB media ID
   * @body field     - "liked" | "watched"
   * @body value     - boolean value to set
   * @returns Updated review row(s)
   */
  .patch(
    "/actions/media",
    async ({ user, body: { mediaType, mediaId, field, value }, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const updatedField = {
        userId: user.id,
        mediaType,
        mediaId,
        field,
        value,
      };
      const result = await updateReview(updatedField);

      if (!result || result.length === 0) {
        throw httpError(404, "Review not found");
      }

      set.status = 200;
      return { data: result, error: null };
    },
    {
      auth: true,
      body: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        mediaId: t.Number(),
        field: t.Union([t.Literal("liked"), t.Literal("watched")]),
        value: t.Boolean(),
      }),
    },
  )

  /**
   * PUT /actions/lists
   *
   * Adds a like or save action to a list.
   *
   * - Requires authentication
   * - Idempotent: if the action already exists, counts are returned unchanged
   * - Otherwise, a new row is inserted and counts incremented
   *
   * @body listId - ID of the list
   * @body field  - "like" | "save"
   * @returns Updated like/save counts
   */
  .put(
    "/actions/lists",
    async ({ user, body: { listId, field }, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const result = await addListAction({ userId: user.id, listId, field });
      if (!result) {
        throw httpError(
          500,
          "Something went wrong while updating list action!",
        );
      }

      set.status = 200;
      return { data: result, error: null };
    },
    {
      auth: true,
      body: t.Object({
        listId: t.Number(),
        field: t.Union([t.Literal("like"), t.Literal("save")]),
      }),
    },
  )

  /**
   * DELETE /actions/lists
   *
   * Removes a like or save action from a list.
   *
   * - Requires authentication
   * - Idempotent: if the action does not exist, counts are returned unchanged
   * - Otherwise, the row is removed and counts decremented (never below zero)
   *
   * @query listId - ID of the list
   * @query field  - "like" | "save"
   * @returns Updated like/save counts
   */
  .delete(
    "/actions/lists",
    async ({ query, user, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const result = await deleteListAction({
        userId: user.id,
        listId: query.listId,
        field: query.field,
      });
      if (!result) {
        throw httpError(
          500,
          "Something went wrong while updating list action!",
        );
      }

      set.status = 200;
      return { data: result, error: null };
    },
    {
      auth: true,
      query: t.Object({
        listId: t.Number(),
        field: t.Union([t.Literal("like"), t.Literal("save")]),
      }),
    },
  );
