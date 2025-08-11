import { Elysia, t } from "elysia";
import { fetchTrending } from "@/services/v1/trending";

export const trending = new Elysia({ name: "trending" })
  .onError(({ code, error }) => {
    console.error("Error in trending route:", error);
    if (code === "VALIDATION") {
      return {
        status: 400,
        message: "Invaid request",
      };
    } else {
      return {
        status: 500,
        message: "Something went wrong while fetching trending data!",
      };
    }
  })
  .get(
    "/trending",
    async ({ query }) => {
      const { filter, timeWindow } = query;
      const data = await fetchTrending(filter, timeWindow);
      return data;
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
