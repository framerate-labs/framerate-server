import { authorizeOwner } from "@/lib/authorization";
import { HttpError, httpError } from "@/lib/httpError";
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

  /**
   * GET /lists
   *
   * Returns all lists owned by the authenticated user.
   *
   * - Requires authentication
   * - Stable response shape: `{ data, error: null }`
   *
   * @returns `{ data: List[], error: null }`
   */
  .get(
    "/lists",
    async ({ user, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const results = await getLists(user.id);

      set.status = 200;
      return { data: results, error: null };
    },
    {
      auth: true,
    },
  )

  /**
   * POST /lists
   *
   * Creates a new list for the authenticated user.
   *
   * Security & behavior:
   * - Requires authentication
   * - Validates `listName` with Zod (`clientListSchema`)
   * - Generates a unique slug for the user
   *
   * Status codes:
   * - 201 on creation
   *
   * @body listName - Name of the new list
   * @returns `{ data: List, error: null }`
   */
  .post(
    "/lists",
    async ({ user, body, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const parsed = clientListSchema.safeParse(body);
      if (!parsed.success) {
        console.error(
          "Zod validation failed. Input:",
          JSON.stringify(body?.listName, null, 2),
        );
        console.error("Zod errors:", parsed.error.flatten());
        throw httpError(400, "Invalid list name");
      }

      // Trim defensively (keeps schema as the source of truth)
      const listName = parsed.data.listName.trim();

      // Generate a unique slug per-user
      const slug = await generateSlug(listName, "list", user.id);

      const result = await createList({
        userId: user.id,
        name: listName,
        slug,
      });

      set.status = 201;
      return { data: result, error: null };
    },
    {
      auth: true,
      body: t.Object({
        listName: t.String(),
      }),
    },
  )

  /**
   * PATCH /lists/:listId
   *
   * Updates mutable fields on a list (currently: name/slug).
   *
   * Security & behavior:
   * - Requires authentication
   * - Verifies ownership via `authorizeOwner("list", listId, user.id)`
   * - Service records slug history when name changes
   *
   * Status codes:
   * - 200 on success
   * - 404 if the list does not exist (from service)
   *
   * @param listId    - ID of the list to update
   * @body  listName  - New name for the list
   * @returns `{ data: List, error: null }`
   */
  .patch(
    "/lists/:listId",
    async ({ user, body, params: { listId }, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      await authorizeOwner("list", listId, user.id);

      const listName = (body.listName ?? "").trim();
      const updates = { name: listName };

      const result = await updateList(user.id, listId, updates);
      if (!result) {
        throw httpError(500, "Failed to update list!");
      }

      set.status = 200;
      return { data: result, error: null };
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

  /**
   * DELETE /lists/:listId
   *
   * Deletes a list owned by the authenticated user.
   * Associated rows (items, likes, saves, views, slug history) must be
   * set to cascade at the DB level.
   *
   * Security & behavior:
   * - Requires authentication
   * - Service enforces ownership; throws 404 if not found/owned
   *
   * Status codes:
   * - 200 on success
   *
   * @param listId - ID of the list to delete
   * @returns `{ data: DeletedList, error: null }`
   */
  .delete(
    "/lists/:listId",
    async ({ user, params: { listId }, set }) => {
      if (!user) throw httpError(401, "Please login or signup to continue");

      const result = await deleteList(user.id, listId);
      if (!result) {
        // Service should already 404/500 but this is a safety fallback
        throw httpError(500, "Failed to delete list!");
      }

      set.status = 200;
      return { data: result, error: null };
    },
    {
      auth: true,
      params: t.Object({
        listId: t.Number(),
      }),
    },
  );
