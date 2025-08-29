import { db } from "@/drizzle";
import { list } from "@/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { httpError } from "./httpError";

const resourceConfig = {
  list: {
    table: list,
    idCol: list.id,
    ownerCol: list.userId,
  },
} as const;

type ResourceKey = keyof typeof resourceConfig;

/**
 * Generic function to authorize ownership of a resource
 *
 * @param resource - The resource type (list, movie, etc.).
 * @param resourceId - The ID of the resource.
 * @param userId - The ID of the user making the request.
 *
 * @throws 401 if no userID
 * @throws 403 if resource found but not owned by user.
 * @throws 404 if resource not found.
 *
 * @returns The found record for handler to consume.
 */
export async function authorizeOwner<R extends ResourceKey>(
  resource: R,
  resourceId: number,
  userId?: string,
) {
  if (!userId) {
    return httpError(401, "Unauthorized");
  }

  const { table, idCol, ownerCol } = resourceConfig[resource];

  const [record] = await db
    .select({ ownerId: list.userId })
    .from(table)
    .where(and(eq(idCol, resourceId), eq(ownerCol, userId)));

  if (!record) {
    return httpError(404, "Resource does not exist.");
  }

  if (record.ownerId !== userId) {
    return httpError(403, "Forbidden");
  }

  return record;
}
