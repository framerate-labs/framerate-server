import { Elysia, t } from "elysia";
import { fetchTrending } from "@/services/v1/trending";

export const trending = new Elysia({ name: "trending" })

  /**
   * GET /trending
   *
   * Returns trending media from TMDB for the given filter and time window.
   *
   * - Public endpoint (no auth)
   * - Validates query params
   * - Stable response shape: `{ data, error: null }`
   *
   * @query filter     - "all" | "movie" | "tv" | "person"
   * @query timeWindow - "day" | "week"
   * @returns `{ data: TrendingItem[], error: null }`
   */
  .get(
    "/trending",
    async ({ query: { filter, timeWindow }, set }) => {
      const data = await fetchTrending(filter, timeWindow);

      set.status = 200;
      return { data, error: null };
    },
    {
      query: t.Object({
        filter: t.Union([
          t.Literal("all"),
          t.Literal("movie"),
          t.Literal("tv"),
          t.Literal("person"),
        ]),
        timeWindow: t.Union([t.Literal("day"), t.Literal("week")]),
      }),
    },
  );
