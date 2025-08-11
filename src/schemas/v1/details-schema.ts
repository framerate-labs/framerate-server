import { z } from "zod";

const personCreditSchema = z.object({
  adult: z.boolean(),
  gender: z.number(),
  id: z.number(),
  known_for_department: z.string(),
  name: z.string(),
  original_name: z.string(),
  popularity: z.number(),
  profile_path: z.string().nullable(),
  credit_id: z.string(),
});

const mediaBaseSchema = z.object({
  adult: z.boolean(),
  backdrop_path: z.string().nullable(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
  homepage: z.string().nullable(),
  id: z.number(),
  origin_country: z.array(z.string()),
  original_language: z.string(),
  overview: z.string().nullable(),
  popularity: z.number(),
  poster_path: z.string().nullable(),
  status: z.string(),
  tagline: z.string().nullable(),
  vote_average: z.number(),
  vote_count: z.number(),
  credits: z.object({
    cast: z.array(
      personCreditSchema.extend({
        character: z.string(),
        order: z.number(),
        cast_id: z.number().optional(),
      }),
    ),
    crew: z.array(
      personCreditSchema.extend({
        department: z.string(),
        job: z.string(),
      }),
    ),
  }),
});

export const tvDetailsBaseSchema = mediaBaseSchema.extend({
  created_by: z.array(
    z.object({
      id: z.number(),
      credit_id: z.string(),
      name: z.string(),
      original_name: z.string(),
      gender: z.number(),
      profile_path: z.string().nullable(),
    }),
  ),
  episode_run_time: z.array(z.number()),
  first_air_date: z.string().nullable(),
  in_production: z.boolean(),
  languages: z.array(z.string()),
  last_air_date: z.string().nullable(),
  last_episode_to_air: z
    .object({
      id: z.number(),
      name: z.string(),
      overview: z.string().nullable(),
      vote_average: z.number(),
      vote_count: z.number(),
      air_date: z.string().nullable(),
      episode_number: z.number(),
      episode_type: z.string(),
      production_code: z.string().nullable(),
      runtime: z.number().nullable(),
      season_number: z.number(),
      show_id: z.number(),
      still_path: z.string().nullable(),
    })
    .nullable(),
  name: z.string(),
  next_episode_to_air: z
    .object({
      id: z.number(),
      name: z.string(),
      overview: z.string().nullable(),
      vote_average: z.number(),
      vote_count: z.number(),
      air_date: z.string().nullable(),
      episode_number: z.number(),
      episode_type: z.string(),
      production_code: z.string().nullable(),
      runtime: z.number().nullable(),
      season_number: z.number(),
      show_id: z.number(),
      still_path: z.string().nullable(),
    })
    .nullable(),
  networks: z.array(
    z.object({
      id: z.number(),
      logo_path: z.string().nullable(),
      name: z.string(),
      origin_country: z.string(),
    }),
  ),
  number_of_episodes: z.number(),
  number_of_seasons: z.number(),
  original_name: z.string(),
  production_companies: z.array(
    z.object({
      id: z.number(),
      logo_path: z.string().nullable(),
      name: z.string(),
      origin_country: z.string(),
    }),
  ),
  production_countries: z.array(
    z.object({ iso_3166_1: z.string(), name: z.string() }),
  ),
  seasons: z.array(
    z.object({
      air_date: z.string().nullable(),
      episode_count: z.number(),
      id: z.number(),
      name: z.string(),
      overview: z.string().nullable(),
      poster_path: z.string().nullable(),
      season_number: z.number(),
      vote_average: z.number(),
    }),
  ),
  spoken_languages: z.array(
    z.object({
      english_name: z.string(),
      iso_639_1: z.string(),
      name: z.string(),
    }),
  ),
  type: z.string(),
});

export const movieDetailsBaseSchema = mediaBaseSchema.extend({
  belongs_to_collection: z
    .object({
      id: z.number(),
      name: z.string(),
      poster_path: z.string().nullable(),
      backdrop_path: z.string().nullable(),
    })
    .nullable(),
  budget: z.number(),
  imdb_id: z.string().nullable(),
  original_title: z.string(),
  production_companies: z.array(
    z.object({
      id: z.number(),
      logo_path: z.string().nullable(),
      name: z.string(),
      origin_country: z.string(),
    }),
  ),
  production_countries: z.array(
    z.object({ iso_3166_1: z.string(), name: z.string() }),
  ),
  release_date: z.string().nullable(),
  revenue: z.number(),
  runtime: z.number().nullable(),
  spoken_languages: z.array(
    z.object({
      english_name: z.string(),
      iso_639_1: z.string(),
      name: z.string(),
    }),
  ),
  title: z.string(),
  video: z.boolean(),
});

export const tvDetailsSchema = tvDetailsBaseSchema.extend({
  media_type: z.literal("tv"),
});
export const movieDetailsSchema = movieDetailsBaseSchema.extend({
  media_type: z.literal("movie"),
});

export const combinedMediaDetailsSchema = z.union([
  tvDetailsSchema,
  movieDetailsSchema,
]);

export type TVDetails = z.infer<typeof tvDetailsSchema>;
export type MovieDetails = z.infer<typeof movieDetailsSchema>;
export type CombinedMediaDetails = z.infer<typeof combinedMediaDetailsSchema>;
