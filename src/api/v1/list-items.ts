import { betterAuth } from "@/middlewares/auth-middleware";
import { addListItem, deleteListItem, getListItem } from "@/services/v1/lists";
import Elysia, { t } from "elysia";

export const listItems = new Elysia({
  name: "list-items",
})
  .use(betterAuth)
  .get(
    "/list-items",
    async ({ user, query: { mediaType, mediaId } }) => {
      if (user) {
        const result = await getListItem(user.id, mediaId, mediaType);

        return {
          data: result,
          error: null,
        };
      } else {
        return {
          data: null,
          error: { code: 401, message: "Please login or signup to continue" },
        };
      }
    },
    {
      auth: true,
      query: t.Object({
        mediaId: t.Number(),
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
      }),
    },
  )
  .post(
    "/list-items",
    async ({ user, body }) => {
      if (user) {
        const { listId, mediaType, mediaId } = body;

        const result = await addListItem({
          listId,
          mediaType,
          movieId: mediaType === "movie" ? mediaId : null,
          seriesId: mediaType === "tv" ? mediaId : null,
          userId: user.id,
        });

        if (!result) {
          return {
            data: null,
            error: {
              code: 500,
              message: "Failed to add list item! Please try again later",
            },
          };
        }

        return {
          data: result,
          error: null,
        };
      } else {
        return {
          data: null,
          error: { code: 401, message: "Please login or signup to continue" },
        };
      }
    },
    {
      auth: true,
      body: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        listId: t.Number(),
        mediaId: t.Number(),
      }),
    },
  )
  .delete(
    "/list-items/:id",
    async ({ user, params: { id: listItemId } }) => {
      if (user) {
        const result = await deleteListItem(user.id, listItemId);

        if (!result) {
          return {
            data: null,
            error: {
              code: 500,
              message: "Failed to delete list item! Please try again later",
            },
          };
        }

        return {
          data: null,
          error: null,
        };
      } else {
        return {
          data: null,
          error: { code: 401, message: "Please login or signup to continue" },
        };
      }
    },
    {
      auth: true,
      params: t.Object({
        id: t.Number(),
      }),
    },
  );
