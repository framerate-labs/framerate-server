import type { MovieDetails, TVDetails } from "@/schemas/v1/details-schema";
import type { MovieDetailsType, TVDetailsType } from "@/types/details";
import { ZodError } from "zod";
import { HttpError } from "@/lib/httpError";

import { combinedMediaDetailsSchema } from "@/schemas/v1/details-schema";
import { objectToCamel } from "ts-case-convert";
import { formatNames, getTables, renameKeys } from "@/lib/utils";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";

const API_TOKEN = process.env.API_TOKEN as string;

type TMDBError = {
  success: boolean;
  status_code: number;
  status_message: string;
};

/**
 * Fetches details for a movie or TV series from TMDB,
 * validates and normalizes the data, stores missing media
 * in the local DB, and merges poster/backdrop overrides.
 *
 * - Calls TMDB /movie/:id or /tv/:id with credits
 * - Validates the response with Zod
 * - Stores the media locally if not already present
 * - Returns a details object
 *
 * @param mediaType - Either "movie" or "tv"
 * @param id - TMDB media ID
 * @returns A normalized MovieDetailsType or TVDetailsType
 */
export async function fetchDetails(mediaType: "movie" | "tv", id: number) {
  if (mediaType !== "movie" && mediaType !== "tv") {
    throw new HttpError(400, `Unsupported media type: ${mediaType}`);
  }

  const url = `https://api.themoviedb.org/3/${mediaType}/${id}?append_to_response=credits&language=en-US`;

  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMessage = `TMDB API Error: ${response.status} ${response.statusText}`;
      try {
        const tmdbError = (await response.json()) as TMDBError;
        errorMessage = `TMDB API Error: ${tmdbError.status_code} – ${tmdbError.status_message}`;
      } catch {
        // Ignore if response wasn’t JSON
      }
      console.error("response", response);
      throw new HttpError(response.status, errorMessage);
    }

    const rawData = await response.json();

    const dataWithMediaType = {
      ...(rawData as object),
      media_type: mediaType,
    };

    const validationResult =
      combinedMediaDetailsSchema.safeParse(dataWithMediaType);

    if (!validationResult.success) {
      console.error(
        "Zod validation failed. Input:",
        JSON.stringify(dataWithMediaType, null, 2),
      );
      console.error("Zod errors:", validationResult.error.flatten());
      throw new HttpError(
        502,
        `Invalid data received from TMDB API: ${validationResult.error.message}`,
      );
    }

    const validatedData = validationResult.data;

    // Trim cast & filter directors
    validatedData.credits.cast = validatedData.credits.cast.slice(0, 12);
    validatedData.credits.crew = validatedData.credits.crew.filter(
      (crewMember) => crewMember.job === "Director",
    );

    // Fetch or insert into DB for local poster/backdrop
    let storedMedia = await getDBImages(id, mediaType);
    if (!storedMedia) {
      const title =
        validatedData.media_type === "movie"
          ? validatedData.title
          : validatedData.name;
      const releaseDate =
        validatedData.media_type === "movie"
          ? validatedData.release_date
          : validatedData.first_air_date;

      const mediaToAdd = {
        id,
        title,
        posterPath: validatedData.poster_path,
        backdropPath: validatedData.backdrop_path,
        releaseDate: releaseDate === "" ? null : releaseDate,
        slug: null,
      };

      storedMedia = await addMediaToDB(mediaToAdd, mediaType);
    }

    // Return type-specific object
    if (validatedData.media_type === "movie") {
      const movieData: MovieDetails = validatedData;
      const directorList = movieData.credits.crew;
      const director = formatNames(directorList);

      const finalMovieData = {
        ...movieData,
        director,
        director_list: directorList,
        poster_path: storedMedia?.posterPath ?? movieData.poster_path,
        backdrop_path: storedMedia?.backdropPath ?? movieData.backdrop_path,
      };

      return objectToCamel(finalMovieData) as unknown as MovieDetailsType;
    } else {
      const tvData: TVDetails = validatedData;
      const creatorList = tvData.created_by;
      const creator = formatNames(creatorList);
      const { created_by, ...restOfTvData } = tvData;

      const tvDataBase = {
        ...restOfTvData,
        creator,
        creator_list: creatorList,
        poster_path: storedMedia?.posterPath ?? tvData.poster_path,
        backdrop_path: storedMedia?.backdropPath ?? tvData.backdrop_path,
      };

      const renamedTvData = renameKeys(
        {
          name: "title",
          original_name: "originalTitle",
          first_air_date: "releaseDate",
        },
        tvDataBase,
      );

      return objectToCamel(renamedTvData) as unknown as TVDetailsType;
    }
  } catch (error) {
    if (error instanceof ZodError) {
      console.error("Error during Zod parsing:", error.flatten());
    } else {
      console.error("Error in fetchDetails:", error);
    }
    throw error;
  }
}

/**
 * Retrieves poster and backdrop image paths for a media item
 * stored in the local DB.
 *
 * @param id - TMDB ID of the media
 * @param mediaType - "movie" or "tv"
 * @returns Poster and backdrop paths, or undefined if not found
 */
export async function getDBImages(id: number, mediaType: "movie" | "tv") {
  const tablesMap = getTables();
  const { table, idCol } = tablesMap[mediaType];

  const [result] = await db
    .select({
      posterPath: table.posterPath,
      backdropPath: table.backdropPath,
    })
    .from(table)
    .where(eq(idCol, id));

  return result;
}

type InsertMedia = {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  slug: string | null;
};

/**
 * Inserts a movie or TV series into the local DB
 * if it does not already exist.
 *
 * @param data - Media object to add
 * @param mediaType - "movie" or "tv"
 * @returns The inserted media row, or undefined if already existed
 */
export async function addMediaToDB(
  data: InsertMedia,
  mediaType: "movie" | "tv",
) {
  const tablesMap = getTables();
  const { table, idCol } = tablesMap[mediaType];

  const [result] = await db
    .insert(table)
    .values(data)
    .onConflictDoNothing({ target: idCol })
    .returning();

  return result;
}
