import { z } from "zod";

export const mediaBaseSchema = z.object({
  adult: z.boolean(),
  backdrop_path: z.string().nullable(),
  genre_ids: z.array(z.number()),
  id: z.number(),
  original_language: z.string(),
  overview: z.string(),
  popularity: z.number(),
  poster_path: z.string().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
});

const trendingMovieSchema = mediaBaseSchema.extend({
  media_type: z.literal("movie"),
  original_title: z.string(),
  release_date: z.string(),
  title: z.string(),
  video: z.boolean(),
});

const trendingTVSchema = mediaBaseSchema.extend({
  media_type: z.literal("tv"),
  first_air_date: z.string(),
  name: z.string(),
  origin_country: z.array(z.string()),
  original_name: z.string(),
});

const trendingPersonSchema = z.object({
  adult: z.boolean(),
  gender: z.number(),
  id: z.number(),
  known_for_department: z.string(),
  media_type: z.literal("person"),
  name: z.string(),
  original_name: z.string(),
  popularity: z.number(),
  profile_path: z.string().nullable(),
});

export const trendingSchema = z.discriminatedUnion(
  "media_type",
  [trendingMovieSchema, trendingTVSchema, trendingPersonSchema],
  {
    errorMap: (issue, ctx) => {
      if (issue.code === z.ZodIssueCode.invalid_union_discriminator) {
        return {
          message:
            'Invalid media type for Trending. Must be "movie", "tv", or "person".',
        };
      }
      return { message: ctx.defaultError };
    },
  },
);

export const trendingResponseSchema = z.object({
  page: z.number(),
  results: z.array(trendingSchema),
  total_pages: z.number(),
  total_results: z.number(),
});
