import { db } from "@/drizzle";
import { list } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { httpError } from "./httpError";

const resourceConfig = {
  list: {
    table: list,
    idCol: list.id,
    ownerCol: list.userId,
  },
} as const;

type ResourceKey = keyof typeof resourceConfig;

type OwnerRow = { ownerId: string };

/**
 * Authorizes that `userId` owns the given `resource` with `resourceId`.
 *
 * Error semantics (minimized information disclosure):
 * - 401 when `userId` is missing
 * - 404 when the resource does not exist **or** exists but is not owned by `userId`
 *   (non-owners are indistinguishable from non-existent resources)
 *
 * Notes:
 * - We fetch by ID only, then compare owner. Non-owners get a 404.
 * - We alias the owner column to `ownerId` and return only that minimal shape.
 * - We **throw** HttpErrors; callers should `await` and let the error propagate.
 *
 * @param resource   One of the configured resource keys (e.g., "list")
 * @param resourceId Numeric ID of the resource
 * @param userId     Authenticated user's ID (string)
 * @returns `{ ownerId: string }` if authorized
 * @throws HttpError (401 | 404)
 */
export async function authorizeOwner<R extends ResourceKey>(
  resource: R,
  resourceId: number,
  userId?: string,
): Promise<OwnerRow> {
  if (!userId) {
    throw httpError(401, "Unauthorized");
  }

  if (!Number.isFinite(resourceId) || resourceId <= 0) {
    // Treat obviously bad IDs as not found to avoid information leakage
    throw httpError(404, "Resource does not exist.");
  }

  const { table, idCol, ownerCol } = resourceConfig[resource];

  // Fetch by ID only — determine existence first
  const [row] = await db
    .select({ ownerId: ownerCol })
    .from(table)
    .where(eq(idCol, resourceId));

  if (!row || row.ownerId !== userId) {
    // Non-owners treated the same as non-existent resources
    throw httpError(404, "Resource does not exist.");
  }

  return row as OwnerRow;
}
