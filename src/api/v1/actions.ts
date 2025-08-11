import { betterAuth } from "@/middlewares/auth-middleware";
import {
  addListAction,
  deleteListAction,
  updateReview,
} from "@/services/v1/actions";
import Elysia, { t } from "elysia";

export const actions = new Elysia({ name: "actions" })
  .use(betterAuth)
  .patch(
    "/actions/media",
    async ({ user, body: { mediaType, mediaId, field, value } }) => {
      if (user) {
        const updatedField = {
          userId: user.id,
          mediaType,
          mediaId,
          field,
          value,
        };
        const result = await updateReview(updatedField);

        return {
          data: result,
          error: null,
        };
      }
    },
    {
      auth: true,
      body: t.Object({
        mediaType: t.Union([t.Literal("movie"), t.Literal("tv")]),
        mediaId: t.Number(),
        field: t.Union([t.Literal("liked"), t.Literal("watched")]),
        value: t.Boolean(),
      }),
    },
  )
  .put(
    "/actions/lists",
    async ({ user, body: { listId, field } }) => {
      const listAction = {
        userId: user.id,
        listId,
        field,
      };

      const result = await addListAction(listAction);

      if (result) {
        return {
          data: result,
          error: null,
        };
      } else {
        return {
          data: null,
          error: "Something went wrong while updating list action!",
        };
      }
    },
    {
      auth: true,
      body: t.Object({
        listId: t.Number(),
        field: t.Union([t.Literal("like"), t.Literal("save")]),
      }),
    },
  )
  .delete(
    "/actions/lists",
    async ({ query, user }) => {
      const listAction = {
        userId: user.id,
        listId: query.listId,
        field: query.field,
      };

      const result = await deleteListAction(listAction);

      if (result) {
        return {
          data: result,
          error: null,
        };
      } else {
        return {
          data: null,
          error: "Something went wrong while updating list action!",
        };
      }
    },
    {
      auth: true,
      query: t.Object({
        listId: t.Number(),
        field: t.Union([t.Literal("like"), t.Literal("save")]),
      }),
    },
  );
