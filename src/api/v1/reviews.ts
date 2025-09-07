import { betterAuth } from "@/middlewares/auth-middleware";
import { httpError } from "@/lib/httpError";
import {
  addReview,
  deleteReview,
  getAllReviews,
  getAvgRating,
  getReview,
} from "@/services/v1/reviews";
import Elysia, { t } from "elysia";

export const reviews = new Elysia({ name: "reviews" })
  .use(betterAuth)

  /**
   * GET /reviews
   *
   * Returns all reviews authored by the authenticated user.
   *
   * - Requires authentication
   * - Stable response shape: `{ data, error: null }`
   *
   * @returns `{ data: ReviewRow[], error: null }`
   */
  .get(
    "/reviews",
    async ({ user, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const result = await getAllReviews(user.id);

      set.status = 200;
      return {
        data: result,
        error: null,
      };
    },
    {
      auth: true,
    },
  )

  /**
   * GET /reviews/:mediaType/:mediaId
   *
   * Returns the authenticated user's review for a specific media item.
   *
   * - Requires authentication
   * - Returns `null` when the user has not reviewed the item
   *
   * @param mediaType - "movie" | "tv"
   * @param mediaId   - TMDB media ID
   * @returns `{ data: { liked, watched, review, rating } | null, error: null }`
   */
  .get(
    "/reviews/:mediaType/:mediaId",
    async ({ user, params: { mediaType, mediaId }, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const result = await getReview(user.id, mediaType, mediaId);

      set.status = 200;
      return {
        data: result ?? null,
        error: null,
      };
    },
    {
      auth: true,
      params: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        mediaId: t.Number(),
      }),
    },
  )

  /**
   * POST /reviews/:mediaType/:mediaId
   *
   * Creates or updates (upsert) the authenticated user's review for a media item.
   *
   * - Requires authentication
   * - Server validates rating format/constraints
   * - Upsert semantics: on conflict (same user + media), rating is updated
   *
   * Status codes:
   * - 201 on create/update success
   *
   * @param mediaType - "movie" | "tv"
   * @param mediaId   - TMDB media ID
   * @body rating     - String rating (validated server-side)
   * @returns `{ data: ReviewRow, error: null }`
   */
  .post(
    "/reviews/:mediaType/:mediaId",
    async ({ user, params: { mediaType, mediaId }, body: { rating }, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const reviewData = { userId: user.id, mediaType, mediaId, rating };
      const result = await addReview(reviewData);

      set.status = 201;
      return {
        data: result,
        error: null,
      };
    },
    {
      auth: true,
      params: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        mediaId: t.Number(),
      }),
      body: t.Object({
        rating: t.String(),
      }),
    },
  )

  /**
   * DELETE /reviews/:mediaType/:mediaId
   *
   * Deletes the authenticated user's review for a media item.
   *
   * - Requires authentication
   * - Returns 404 if there was no review to delete (idempotent-friendly but explicit)
   *
   * @param mediaType - "movie" | "tv"
   * @param mediaId   - TMDB media ID
   * @returns `{ data: "success", error: null }`
   */
  .delete(
    "/reviews/:mediaType/:mediaId",
    async ({ user, params: { mediaType, mediaId }, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const deleted = await deleteReview(user.id, mediaId, mediaType);
      if (!deleted) {
        throw httpError(404, "Review not found");
      }

      set.status = 200;
      return {
        data: "success",
        error: null,
      };
    },
    {
      auth: true,
      params: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        mediaId: t.Number(),
      }),
    },
  )

  /**
   * GET /reviews/:mediaType/:mediaId/average
   *
   * Returns the average rating and total review count for a media item
   * across all users.
   *
   * - Public endpoint (no auth required)
   * - `avgRating` is `null` when there are no reviews
   *
   * @param mediaType - "movie" | "tv"
   * @param mediaId   - TMDB media ID
   * @returns `{ data: { avgRating: number|null, reviewCount: number }, error: null }`
   */
  .get(
    "/reviews/:mediaType/:mediaId/average",
    async ({ params: { mediaType, mediaId }, set }) => {
      const result = await getAvgRating(mediaType, mediaId);

      if (!result) {
        throw httpError(500, "Failed to get average rating!");
      }

      set.status = 200;
      return {
        data: result,
        error: null,
      };
    },
    {
      params: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        mediaId: t.Number(),
      }),
    },
  );
