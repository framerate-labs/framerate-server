import { objectToCamel } from "ts-case-convert";
import { renameKeys } from "@/lib/utils";
import { trendingResponseSchema } from "@/schemas/v1/trending-schema";
import { HttpError } from "@/lib/httpError";

const API_TOKEN = process.env.API_TOKEN;

type TMDBError = {
  success: boolean;
  status_code: number;
  status_message: string;
};

type TimeWindow = "day" | "week";
type Filter = "all" | "movie" | "tv" | "person";

/**
 * Fetches trending media from TMDB, validates the payload,
 * normalizes field names, and returns a trimmed list.
 *
 * Behavior & safety:
 * - Throws 500 if API token is missing
 * - Maps TMDB errors into HttpError with status codes
 * - Validates response with Zod; returns 502 on schema mismatch
 * - Renames TV fields to movie-like keys (title/originalTitle/releaseDate)
 * - Limits results to the top 18 items
 *
 * @param filter - "all" | "movie" | "tv" | "person"
 * @param timeWindow - "day" | "week"
 * @returns Array of normalized trending items
 */
export async function fetchTrending(filter: Filter, timeWindow: TimeWindow) {
  if (!API_TOKEN) {
    throw new HttpError(500, "Server misconfiguration: missing API token");
  }

  const url = `https://api.themoviedb.org/3/trending/${filter}/${timeWindow}?language=en-US`;

  const options: RequestInit = {
    method: "GET",
    headers: {
      accept: "application/json",
      Authorization: `Bearer ${API_TOKEN}`,
    },
  };

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      // Try to parse TMDB's structured error; fall back to status text
      let message = `TMDB API Error: ${response.status} ${response.statusText}`;
      try {
        const tmdbError = (await response.json()) as TMDBError;
        if (tmdbError?.status_message) {
          message = `TMDB API Error: ${tmdbError.status_code} – ${tmdbError.status_message}`;
        }
      } catch {
        // Non-JSON error body — keep default message
      }
      throw new HttpError(response.status, message);
    }

    const rawData = await response.json();

    const validationResult = trendingResponseSchema.safeParse(rawData);
    if (!validationResult.success) {
      console.error("Zod validation failed:", validationResult.error.message);
      throw new HttpError(502, "Invalid data received from TMDB API.");
    }

    const validatedData = validationResult.data;

    // Convert snake_case to camelCase for client usability
    const transformedData = objectToCamel(validatedData);

    // Normalize TV fields to movie-like naming for the client
    const formattedData = transformedData.results.map((media: any) => {
      if (media.mediaType === "tv") {
        return renameKeys(
          {
            name: "title",
            originalName: "originalTitle",
            firstAirDate: "releaseDate",
          },
          media,
        );
      }
      return media;
    });

    // Cap to 18 items for UI efficiency
    return formattedData.slice(0, 18);
  } catch (error) {
    console.error("Error in fetchTrending:", error);
    throw error;
  }
}
