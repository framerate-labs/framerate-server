import type { MovieDetails, TVDetails } from "@/schemas/v1/details-schema";
import { combinedMediaDetailsSchema } from "@/schemas/v1/details-schema";

import { objectToCamel } from "ts-case-convert";

import { formatNames, getTables, renameKeys } from "@/lib/utils";

import { ZodError } from "zod";
import { db } from "@/drizzle";
import { eq } from "drizzle-orm";
import type { MovieDetailsType, TVDetailsType } from "@/types/details";

const API_TOKEN = process.env.API_TOKEN as string;

type TMDBError = {
  success: boolean;
  status_code: number;
  status_message: string;
};

/**
 * Gets details for movie or series by ID
 *
 * @param mediaType - movie or tv
 * @param id - ID of media to fetch
 * @returns An object containing the media data
 */
export async function fetchDetails(mediaType: "movie" | "tv", id: number) {
  if (mediaType !== "movie" && mediaType !== "tv") {
    throw new Error(`Unsupported media type: ${mediaType}`);
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
      } catch (jsonError) {
        // Ignore JSON parsing error if the response wasn't JSON
      }
      console.error("response", response);
      throw new Error(errorMessage);
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
      throw new Error(
        `Invalid data received from TMDB API: ${validationResult.error.message}`,
      );
    }

    const validatedData = validationResult.data;

    validatedData.credits.cast = validatedData.credits.cast.slice(0, 12);
    validatedData.credits.crew = validatedData.credits.crew.filter(
      (crewMember) => crewMember.job === "Director",
    );

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

      const movieResults = objectToCamel(finalMovieData);

      return movieResults as unknown as MovieDetailsType;
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

      const tvResults = objectToCamel(renamedTvData);

      return tvResults as unknown as TVDetailsType;
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
 * Gets the poster and backdrop for a movie or series
 *
 * @param id - The ID of the media to get
 * @returns The poster and backdrop from the database
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
 * Adds a movie or series to the database if it does not exist
 *
 * @param data - The media object to add to the database
 * @returns The created media object
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
