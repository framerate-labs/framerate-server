import { fetchDetails } from "@/services/v1/details";
import Elysia, { t } from "elysia";
import { HttpError } from "@/lib/httpError";

export const details = new Elysia({
  name: "details",
})
  /**
   * GET /details/:type/:id
   *
   * Fetches details for a movie or TV series by TMDB ID.
   * Returns a typed details object from TMDB + DB data.
   *
   * @param type - "movie", "tv", or "person" (unsupported for now)
   * @param id - numeric TMDB ID
   */
  .get(
    "/details/:type/:id",
    async ({ params: { type, id } }) => {
      if (type === "person") {
        throw new HttpError(400, "Sorry, we don't support people search yet!");
      }

      const data = await fetchDetails(type, id);
      return data;
    },
    {
      params: t.Object({
        type: t.Union([
          t.Literal("movie"),
          t.Literal("tv"),
          t.Literal("person"),
        ]),
        id: t.Number(),
      }),
    },
  );
