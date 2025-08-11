import { betterAuth } from "@/middlewares/auth-middleware";
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
  // gets all user reviews
  .get(
    "/reviews",
    async ({ user }) => {
      if (user) {
        const result = await getAllReviews(user.id);

        return {
          data: result,
          error: null,
        };
      } else {
        return {
          data: null,
          error: "Not logged in",
        };
      }
    },
    {
      auth: true,
    },
  )
  // gets user review
  .get(
    "/reviews/:mediaType/:mediaId",
    async ({ user, params: { mediaType, mediaId } }) => {
      if (user) {
        const result = await getReview(user.id, mediaType, mediaId);

        return {
          data: result,
          error: null,
        };
      } else {
        return {
          data: null,
          error: { code: 401, message: "Please login or signup to continue" },
        };
      }
    },
    {
      auth: true,
      params: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        mediaId: t.Number(),
      }),
    },
  )
  // creates user review
  .post(
    "/reviews/:mediaType/:mediaId",
    async ({ user, params: { mediaType, mediaId }, body: { rating } }) => {
      if (user) {
        const reviewData = { userId: user.id, mediaType, mediaId, rating };
        const result = await addReview(reviewData);
        return {
          data: result,
          error: null,
        };
      }
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
  // deletes user review
  .delete(
    "/reviews/:mediaType/:mediaId",
    async ({ user, params: { mediaType, mediaId } }) => {
      if (user) {
        const result = await deleteReview(user.id, mediaId, mediaType);
        return {
          data: "success",
          error: null,
        };
      }
    },
    {
      auth: true,
      params: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        mediaId: t.Number(),
      }),
    },
  )
  // gets average rating
  .get(
    "/reviews/:mediaType/:mediaId/average",
    async ({ params: { mediaType, mediaId } }) => {
      const result = await getAvgRating(mediaType, mediaId);

      if (!result) {
        return {
          data: null,
          error: { code: 500, message: "Failed to get average rating!" },
        };
      }

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
