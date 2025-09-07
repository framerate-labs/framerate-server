import { db } from "@/drizzle";
import { list, listLikes, listSaves } from "@/drizzle/schema";
import { getReviewTables } from "@/lib/utils";
import { and, eq, sql } from "drizzle-orm";

type ReviewData = {
  userId: string;
  mediaType: "movie" | "tv";
  mediaId: number;
  field: "liked" | "watched";
  value: boolean;
};

type ListAction<T> = {
  userId: string;
  listId: number;
  field: T;
};

/**
 * Updates a user's review for a specific movie or series.
 *
 * If a review exists, it will be updated. If no review exists,
 * the route layer will return a 404.
 *
 * @param param - Object containing the user ID, media type, media ID,
 *                 the review field to update, and the new value to set.
 * @returns The updated review rows
 */
export async function updateReview({
  userId,
  field,
  value,
  mediaId,
  mediaType,
}: ReviewData) {
  const tablesMap = getReviewTables();
  const { table, idCol } = tablesMap[mediaType];

  const result = await db
    .update(table)
    .set({ [field]: value, updatedAt: new Date() })
    .where(and(eq(table.userId, userId), eq(idCol, mediaId)))
    .returning();

  return result;
}

/**
 * Inserts a row representing a like or save action on a list.
 *
 * - If the action already exists the current counts are returned with no changes.
 * - If the action is new, the row is inserted and the list count is incremented.
 *
 * @param listAction - An object containing the user conducting the action and the action type.
 * @returns An object containing the updated like/save count for the list.
 */
export async function addListAction<T extends "like" | "save">(
  listAction: ListAction<T>,
) {
  const { userId, listId, field } = listAction;

  const tablesMap = {
    like: {
      actionTable: listLikes,
      actionCol: list.likeCount,
      actionColName: "likeCount" as const,
    },
    save: {
      actionTable: listSaves,
      actionCol: list.saveCount,
      actionColName: "saveCount" as const,
    },
  };

  const { actionTable, actionCol, actionColName } = tablesMap[field];

  const result = await db.transaction(async (trx) => {
    const inserted = await trx
      .insert(actionTable)
      .values({ userId, listId })
      .onConflictDoNothing({
        target: [actionTable.userId, actionTable.listId],
      })
      .returning();

    if (inserted.length === 0) {
      // Already exists
      const [current] = await trx
        .select({ likeCount: list.likeCount, saveCount: list.saveCount })
        .from(list)
        .where(eq(list.id, listId));
      return current;
    }

    // Fresh insert
    const [updated] = await trx
      .update(list)
      .set({ [actionColName]: sql`${actionCol} + 1` })
      .where(eq(list.id, listId))
      .returning({ likeCount: list.likeCount, saveCount: list.saveCount });

    return updated;
  });

  if (!result) return undefined;

  if (field === "like") return { likeCount: result.likeCount };
  return { saveCount: result.saveCount };
}

/**
 * Deletes a row representing a like or save action on a list.
 *
 * - If the action does not exist the current counts are returned unchanged.
 * - If the action exists, the row is removed and the list count is decremented.
 *
 * @param listAction - An object containing the user conducting the action and the action type.
 * @returns An object containing the updated like/save count for the list.
 */
export async function deleteListAction<T extends "like" | "save">(
  listAction: ListAction<T>,
) {
  const { userId, listId, field } = listAction;

  const tablesMap = {
    like: {
      actionTable: listLikes,
      actionCol: list.likeCount,
      actionColName: "likeCount" as const,
    },
    save: {
      actionTable: listSaves,
      actionCol: list.saveCount,
      actionColName: "saveCount" as const,
    },
  };

  const { actionTable, actionCol, actionColName } = tablesMap[field];

  const result = await db.transaction(async (trx) => {
    const deleted = await trx
      .delete(actionTable)
      .where(
        and(eq(actionTable.userId, userId), eq(actionTable.listId, listId)),
      )
      .returning();

    if (deleted.length === 0) {
      const [current] = await trx
        .select({ likeCount: list.likeCount, saveCount: list.saveCount })
        .from(list)
        .where(eq(list.id, listId));
      return current;
    }

    // Ensure we don't attempt to decrement below zero
    const [updated] = await trx
      .update(list)
      .set({
        [actionColName]: sql`GREATEST(${actionCol} - 1, 0)`,
      })
      .where(eq(list.id, listId))
      .returning({ likeCount: list.likeCount, saveCount: list.saveCount });

    return updated;
  });

  if (!result) return undefined;

  if (field === "like") return { likeCount: result.likeCount };
  return { saveCount: result.saveCount };
}
