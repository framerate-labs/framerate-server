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
 * If a review exists, it will be updated. If no review exists, request is ignored.
 *
 * @param param - Object containing the user ID, media type, media ID,
 *                 the review field to update, and the new value to set.
 * @returns The updated review object
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
 * Inserts a row to the DB representing a like or save action on a list
 * @param listAction - An object containing the user conducting the action and the action to take
 * @returns An object containing the like or save count for the list
 */
export async function addListAction<T extends "like" | "save">(
  listAction: ListAction<T>,
) {
  const { userId, listId, field } = listAction;

  const tablesMap = {
    like: {
      actionTable: listLikes,
      actionCol: list.likeCount,
      actionColName: "likeCount",
    },
    save: {
      actionTable: listSaves,
      actionCol: list.saveCount,
      actionColName: "saveCount",
    },
  };

  const { actionTable, actionCol, actionColName } = tablesMap[field];

  const result = await db.transaction(async (trx) => {
    const insertResult = await trx
      .insert(actionTable)
      .values({ userId, listId })
      .onConflictDoNothing({
        target: [actionTable.userId, actionTable.listId],
      })
      .returning();

    if (insertResult.length === 0) {
      return;
    }

    const [listResult] = await trx
      .update(list)
      .set({ [actionColName]: sql`${actionCol} + 1` })
      .where(eq(list.id, listId))
      .returning();

    return listResult;
  });

  if (result && field === "like") {
    return { likeCount: result.likeCount };
  }

  if (result && field === "save") {
    return { saveCount: result.saveCount };
  }
}

/**
 * Deletes a row from the DB representing a like or save action on a list
 * @param listAction - An object containing the user conducting the action and the action to take
 * @returns An object containing the like or save count for the list
 */
export async function deleteListAction<T extends "like" | "save">(
  listAction: ListAction<T>,
) {
  const { userId, listId, field } = listAction;

  const tablesMap = {
    like: {
      actionTable: listLikes,
      actionCol: list.likeCount,
      actionColName: "likeCount",
    },
    save: {
      actionTable: listSaves,
      actionCol: list.saveCount,
      actionColName: "saveCount",
    },
  };

  const { actionTable, actionCol, actionColName } = tablesMap[field];

  const result = await db.transaction(async (trx) => {
    await trx
      .delete(actionTable)
      .where(
        and(eq(actionTable.userId, userId), eq(actionTable.listId, listId)),
      );

    const [listResult] = await trx
      .update(list)
      .set({ [actionColName]: sql`${actionCol} - 1` })
      .where(eq(list.id, listId))
      .returning();

    return listResult;
  });

  if (result && field === "like") {
    return { likeCount: result.likeCount };
  }

  if (result && field === "save") {
    return { saveCount: result.saveCount };
  }
}
