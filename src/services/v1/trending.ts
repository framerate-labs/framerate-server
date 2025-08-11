import { objectToCamel } from "ts-case-convert";

import { renameKeys } from "@/lib/utils";
import { trendingResponseSchema } from "@/schemas/v1/trending-schema";

const API_TOKEN = process.env.API_TOKEN;

type TMDBError = {
  success: boolean;
  status_code: number;
  status_message: string;
};

export async function fetchTrending(
  filter: "all" | "movie" | "tv" | "person",
  timeWindow: string,
) {
  const url = `https://api.themoviedb.org/3/trending/${filter}/${timeWindow}?language=en-US`;

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
      const tmdbError = (await response.json()) as TMDBError;
      const error = new Error(
        `TMDB API Error: ${tmdbError.status_code} – ${tmdbError.status_message}`,
      );
      throw error;
    }

    const rawData = await response.json();

    const validationResult = trendingResponseSchema.safeParse(rawData);

    if (!validationResult.success) {
      console.error("Zod validation failed:", validationResult.error.message);
      throw new Error("Invalid data received from TMDB API.");
    }

    const validatedData = validationResult.data;

    const transformedData = objectToCamel(validatedData);

    const formattedData = transformedData.results.map((media) => {
      if (media.mediaType === "tv") {
        const tvResults = renameKeys(
          {
            name: "title",
            originalName: "originalTitle",
            firstAirDate: "releaseDate",
          },
          media,
        );
        return tvResults;
      } else {
        return media;
      }
    });

    return formattedData.slice(0, 18);
  } catch (error) {
    console.error("Error in fetchTrending:", error);
    throw error;
  }
}
