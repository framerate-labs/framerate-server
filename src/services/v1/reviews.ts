import { db } from "@/drizzle";
import { movie, movieReview, tv, tvReview } from "@/drizzle/schema";
import { getReviewTables } from "@/lib/utils";
import { validateRating } from "@/lib/validate-rating";
import type { Review } from "@/types/review";
import { and, avg, count, eq } from "drizzle-orm";
import { HttpError } from "@/lib/httpError";

/**
 * Retrieves a single user's review for a specific media item.
 *
 * @param userId - The ID of the user who wrote the review
 * @param mediaType - "movie" | "tv"
 * @param mediaId - TMDB media ID
 * @returns `{ liked, watched, review, rating } | undefined`
 */
export async function getReview(
  userId: string,
  mediaType: "movie" | "tv",
  mediaId: number,
) {
  const tablesMap = getReviewTables();
  const { table, idCol } = tablesMap[mediaType];

  const [result] = await db
    .select({
      liked: table.liked,
      watched: table.watched,
      review: table.review,
      rating: table.rating,
    })
    .from(table)
    .where(and(eq(table.userId, userId), eq(idCol, mediaId)));

  return result;
}

/**
 * Retrieves all reviews created by a given user across movies and TV,
 * merged into a single array.
 *
 * @param userId - The user whose reviews to fetch
 * @returns `Array<{ mediaId, mediaType, title, posterPath, rating, createdAt }>`
 */
export async function getAllReviews(userId: string) {
  const moviePromise = db
    .select({
      mediaId: movieReview.movieId,
      mediaType: movieReview.mediaType,
      title: movie.title,
      posterPath: movie.posterPath,
      rating: movieReview.rating,
      createdAt: movieReview.createdAt,
    })
    .from(movie)
    .innerJoin(movieReview, eq(movie.id, movieReview.movieId))
    .where(eq(movieReview.userId, userId));

  const tvPromise = db
    .select({
      mediaId: tvReview.seriesId,
      mediaType: tvReview.mediaType,
      title: tv.title,
      posterPath: tv.posterPath,
      rating: tvReview.rating,
      createdAt: tvReview.createdAt,
    })
    .from(tv)
    .innerJoin(tvReview, eq(tv.id, tvReview.seriesId))
    .where(eq(tvReview.userId, userId));

  const [movieReviews, tvReviews] = await Promise.all([
    moviePromise,
    tvPromise,
  ]);

  return [...movieReviews, ...tvReviews] as Review<"movie" | "tv">[];
}

/**
 * Computes the average rating and total rating count for a media item.
 *
 * @param mediaType - "movie" | "tv"
 * @param mediaId - TMDB media ID
 * @returns `{ avgRating: number|null, reviewCount: number }`
 */
export async function getAvgRating(mediaType: "movie" | "tv", mediaId: number) {
  const tablesMap = getReviewTables();
  const { table, idCol } = tablesMap[mediaType];

  const [result] = await db
    .select({
      avgRating: avg(table.rating).mapWith(Number),
      reviewCount: count(table.rating).mapWith(Number),
    })
    .from(table)
    .where(eq(idCol, mediaId));

  return {
    avgRating: result?.avgRating ?? null,
    reviewCount: result?.reviewCount ?? 0,
  };
}

type AddReview = {
  userId: string;
  mediaType: "movie" | "tv";
  mediaId: number;
  rating: string;
};

/**
 * Creates or updates a review for a media item (upsert).
 *
 * Validation & behavior:
 * - Validates rating with `validateRating` (throws 400 on failure)
 * - Inserts a new review with sane defaults (`liked=false`, `watched=true`, `review=null`)
 * - On conflict (same user + media), updates `rating` and `updatedAt`
 *
 * @param data - `{ userId, mediaType, mediaId, rating }`
 * @returns The inserted/updated review row
 */
export async function addReview(data: AddReview) {
  const tablesMap = getReviewTables();
  const { table, idCol, idColName } = tablesMap[data.mediaType];

  const { userId, mediaType, mediaId } = data;
  const rating = (data.rating ?? "").trim();

  const error = validateRating(rating);
  if (error) {
    throw new HttpError(400, error);
  }

  const [result] = await db
    .insert(table)
    .values({
      userId,
      mediaType,
      [idColName]: mediaId,
      rating,
      liked: false,
      watched: true,
      review: null,
    })
    .onConflictDoUpdate({
      target: [table.userId, idCol],
      set: { rating, updatedAt: new Date() },
    })
    .returning();

  return result;
}

/**
 * Deletes a user's review for a specific media item.
 *
 * @param userId - The author of the review
 * @param mediaId - TMDB media ID
 * @param mediaType - "movie" | "tv"
 * @returns The deleted review row, or `undefined` if none existed
 */
export async function deleteReview(
  userId: string,
  mediaId: number,
  mediaType: "movie" | "tv",
) {
  const tablesMap = getReviewTables();
  const { table, idCol } = tablesMap[mediaType];

  const [result] = await db
    .delete(table)
    .where(
      and(
        eq(table.userId, userId),
        eq(table.mediaType, mediaType),
        eq(idCol, mediaId),
      ),
    )
    .returning();

  return result;
}
