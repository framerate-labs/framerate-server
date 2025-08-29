import { authorizeOwner } from "@/lib/authorization";
import { HttpError } from "@/lib/httpError";
import { generateSlug } from "@/lib/slug";
import { betterAuth } from "@/middlewares/auth-middleware";
import { clientListSchema } from "@/schemas/v1/list-schema";
import {
  createList,
  deleteList,
  getLists,
  updateList,
} from "@/services/v1/lists";
import Elysia, { t } from "elysia";

export const lists = new Elysia({ name: "lists" })
  .use(betterAuth)
  .onError(({ code, error }) => {
    // console.error("Error in collections route:", error);

    if (error instanceof HttpError) {
      return { status: error.status, message: error.message };
    }

    console.log(error);

    if (code === 400) {
      return { status: code, message: "Invalid list name" };
    } else if (code === 401) {
      return {
        status: code,
        message: "Please create an account or log in to continue.",
      };
    } else {
      return {
        status: code ?? 500,
        message: "Something went wrong while fetching collections data!",
      };
    }
  })
  .get(
    "/lists",
    async ({ user }) => {
      if (user) {
        const lists = await getLists(user.id);

        return { data: lists, error: null };
      } else {
        return {
          data: null,
          error: { code: 401, message: "Please login or signup to continue" },
        };
      }
    },
    {
      auth: true,
    },
  )
  .post(
    "/lists",
    async ({ user, body, error }) => {
      const parsed = clientListSchema.safeParse(body);

      if (!parsed.success) {
        console.error(
          "Zod validation failed. Input:",
          JSON.stringify(body.listName, null, 2),
        );
        console.error("Zod errors:", parsed.error.flatten());
        throw error(400);
      }

      const { listName } = parsed.data;

      if (user) {
        const slug = await generateSlug(listName, "list", user.id);

        const results = await createList({
          userId: user.id,
          name: listName,
          slug,
        });

        return results;
      } else {
        throw error(401);
      }
    },
    {
      auth: true,
      body: t.Object({
        listName: t.String(),
      }),
    },
  )
  .patch(
    "/lists/:listId",
    async ({ user, body, params: { listId } }) => {
      await authorizeOwner("list", listId, user?.id);

      const updates = { name: body.listName };

      const result = await updateList(user.id, listId, updates);

      if (result) {
        return { data: result, error: null };
      }

      return { data: null, error: "Failed to update list!" };
    },
    {
      auth: true,
      body: t.Object({
        listName: t.String(),
      }),
      params: t.Object({
        listId: t.Number(),
      }),
    },
  )
  .delete(
    "/lists/:listId",
    async ({ user, params: { listId } }) => {
      const result = await deleteList(user.id, listId);

      if (result) {
        return { data: result, error: null };
      }

      return { data: null, error: "Failed to delete list!" };
    },
    {
      auth: true,
      params: t.Object({
        listId: t.Number(),
      }),
    },
  );
