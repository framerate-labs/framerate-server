import type { Session, User } from "better-auth";

import { db } from "@/drizzle";
import {
  listLikes,
  list,
  listItem,
  movie,
  listSaves,
  tv,
  user,
  listView,
  listSlugHistory,
} from "@/drizzle/schema";
import { and, asc, desc, eq, gte, or, sql } from "drizzle-orm";
import { getHashedValue } from "@/lib/utils";
import { generateSlug } from "@/lib/slug";

type ListUpdates = {
  name: string;
};

/**
 * Creates a list in database
 * @param data - The list data to insert
 * @returns The newly created list
 */
export async function createList(data: typeof list.$inferInsert) {
  const [result] = await db.insert(list).values(data).returning();
  const formattedResults = { type: "list" as const, ...result };
  return formattedResults;
}

/**
 * Gets all database lists belonging to a user
 * @param userId - The ID of the user for whom to get lists
 * @returns All lists belonging to the user
 */
export async function getLists(userId: string) {
  const results = await db
    .select()
    .from(list)
    .where(eq(list.userId, userId))
    .orderBy(asc(list.createdAt));

  const formattedResults = results.map((result) => ({
    type: "list" as const,
    ...result,
  }));
  return formattedResults;
}

/**
 * Updates list values if they have changed
 * @param userId - User that owns the list
 * @param listId - List to update
 * @param updates - Updates to make to the list
 * @returns The updated list object from the DB
 */
export async function updateList(
  userId: string,
  listId: number,
  updates: ListUpdates,
) {
  const result = await db.transaction(async (trx) => {
    const [listRecord] = await trx
      .select()
      .from(list)
      .where(and(eq(list.userId, userId), eq(list.id, listId)));

    if (!listRecord) {
      throw new Error(
        "List not found or you are not authorized to make changes to this list.",
      );
    }

    if (updates.name && updates.name !== listRecord.name) {
      const oldSlug = listRecord.slug;

      await trx
        .insert(listSlugHistory)
        .values({ listId: listRecord.id, oldSlug });

      const newSlug = await generateSlug(updates.name, "list", userId);

      const [updateResult] = await trx
        .update(list)
        .set({ name: updates.name, slug: newSlug, updatedAt: new Date() })
        .where(and(eq(list.userId, userId), eq(list.id, listId)))
        .returning();

      if (updateResult) {
        return updateResult;
      }
    }

    return listRecord;
  });

  return { type: "list" as const, ...result };
}

/**
 * Deletes a user's list, including all related data such as slug history, likes, saves, and views
 * @param userId - ID of the list owner
 * @param listId - ID of the list to delete
 * @returns An object representing the deleted list
 */
export async function deleteList(userId: string, listId: number) {
  const [listRecord] = await db
    .select({ id: list.id })
    .from(list)
    .where(and(eq(list.userId, userId), eq(list.id, listId)));

  if (!listRecord) {
    throw new Error(
      "List not found or you are not authorized to make changes to this list.",
    );
  }

  // This is a cascading delete operation
  const [deletedList] = await db
    .delete(list)
    .where(and(eq(list.id, listId), eq(list.userId, userId)))
    .returning();

  if (!deletedList) {
    throw new Error("Failed to delete the list or list was already deleted.");
  }

  return deletedList;
}

/**
 * Adds list item to a user's existing database list
 * @param data - List item to insert
 * @returns The inserted list item or undefined
 */
export async function addListItem(data: typeof listItem.$inferInsert) {
  const [result] = await db.transaction(async (trx) => {
    const insertedItem = await trx.insert(listItem).values(data).returning();

    await trx
      .update(list)
      .set({ updatedAt: new Date() })
      .where(eq(list.id, data.listId));

    return insertedItem;
  });

  return result;
}

/**
 * Gets media saved to a list by the current user, if any
 * @param mediaId - The ID of the media to check
 * @param mediaType - The type of media ("movie" or "tv")
 * @returns The matching list item or undefined if it does not exist
 */
export async function getListItem(
  userId: string,
  mediaId: number,
  mediaType: "movie" | "tv",
) {
  // Determine which field to query based on media type
  const mediaField = mediaType === "movie" ? "movieId" : "seriesId";

  const [result] = await db
    .select({
      listId: listItem.listId,
      listItemId: listItem.id,
      mediaType: listItem.mediaType,
      mediaId: mediaType === "movie" ? listItem.movieId : listItem.seriesId,
    })
    .from(listItem)
    .where(and(eq(listItem.userId, userId), eq(listItem[mediaField], mediaId)));

  return result;
}

/**
 * Gets list data, including list items and metadata
 * @param username - The username of the user who created the list
 * @param slug - The list URL slug
 * @param userSession - If the list viewer is logged in, this is their active session
 * @returns An object with the list's data
 */
export async function getListData(
  username: string,
  slug: string,
  userSession: User | undefined,
) {
  const [results] = await db
    .select()
    .from(list)
    .innerJoin(user, eq(user.id, list.userId))
    .where(and(eq(user.username, username), eq(list.slug, slug)));

  if (!results) {
    throw new Error("Error: something went wrong!");
  }

  const { list: listResult } = results;

  const listItems = await getListItems(listResult.id);

  if (userSession) {
    const isLiked = await getLikeStatus(userSession.id, listResult.id);
    const isSaved = await getSaveStatus(userSession.id, listResult.id);

    return {
      list: { type: "list" as const, ...listResult },
      isLiked,
      isSaved,
      listItems,
    };
  }

  return {
    list: { type: "list" as const, ...listResult },
    isLiked: false,
    isSaved: false,
    listItems,
  };
}

/**
 * Gets all list items belonging to a list
 * @param listId - The ID of the list
 * @returns An array of list item objects
 */
async function getListItems(listId: number) {
  try {
    const results = await db
      .select({
        listId: listItem.listId,
        mediaId: sql<number>`COALESCE(${movie.id}, ${tv.id})`,
        listItemId: listItem.id,
        title: sql<string>`COALESCE(${movie.title}, ${tv.title})`,
        posterPath: sql<string>`COALESCE(${movie.posterPath}, ${tv.posterPath})`,
        createdAt: listItem.createdAt,
        mediaType: sql<"movie" | "tv">`CASE
            WHEN ${movie.id} IS NOT NULL THEN 'movie'
            ELSE 'tv'
          END`,
      })
      .from(listItem)
      .leftJoin(movie, eq(listItem.movieId, movie.id))
      .leftJoin(tv, eq(listItem.seriesId, tv.id))
      .where(eq(listItem.listId, listId))
      .orderBy(desc(listItem.createdAt));

    return results;
  } catch (_error) {
    throw new Error("Failed to get list items.");
  }
}

/**
 * Checks if the user has liked a list
 * @param userId - ID of the user
 * @param listId - ID of the list to check
 * @returns Boolean representing whether the list is liked by the user
 */
async function getLikeStatus(userId: string, listId: number): Promise<boolean> {
  try {
    const [result]: Record<"isliked", boolean>[] = await db.execute(
      sql`SELECT EXISTS (
        SELECT 1 FROM ${listLikes}
        WHERE ${listLikes.userId} = ${userId}
        AND ${listLikes.listId} = ${listId}
      ) as isliked`,
    );

    if (result && result.isliked) {
      return result.isliked;
    }

    return false;
  } catch (_error) {
    throw new Error("Failed to get like status!");
  }
}

/**
 * Checks if the user has saved a list
 * @param userId - ID of the user
 * @param listId - ID of the list to check
 * @returns Boolean representing whether the list is saved by the user
 */
async function getSaveStatus(userId: string, listId: number): Promise<boolean> {
  try {
    const [result]: Record<"issaved", boolean>[] = await db.execute(
      sql`SELECT EXISTS (
        SELECT 1 FROM ${listSaves}
        WHERE ${listSaves.userId} = ${userId}
        AND ${listSaves.listId} = ${listId}
      ) as issaved`,
    );

    if (result && result.issaved) {
      return result.issaved;
    }

    return false;
  } catch (_error) {
    throw new Error("Failed to get save status!");
  }
}

/**
 * Removes specific media from a user's list
 * @param listItemId - ID of the media to remove from a list
 * @returns The removed list item or undefined
 */
export async function deleteListItem(userId: string, listItemId: number) {
  const [result] = await db
    .delete(listItem)
    .where(and(eq(listItem.userId, userId), eq(listItem.id, listItemId)))
    .returning();

  return result;
}

/**
 * Logs a view on a list if it is unique in a rolling 24-hour window
 * @param listId - ID of the list viewed
 * @param ipAddress - IP Adress of the viewer
 * @param userId - Optional ID of the viewer
 * @returns An object representing the status of the view
 */
export async function trackUniqueView(
  listId: number,
  ipAddress: string | null,
  userId?: string,
) {
  if (!listId || (!userId && !ipAddress)) {
    return {
      success: false,
      alreadyViewed: false,
      message: "Invalid input: unable to store view.",
    };
  }
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const hashedIp = ipAddress ? getHashedValue(ipAddress) : null;

  try {
    const existingView = await db
      .select()
      .from(listView)
      .where(
        and(
          eq(listView.listId, listId),
          gte(listView.createdAt, oneDayAgo),
          or(
            userId ? eq(listView.userId, userId) : undefined,
            hashedIp ? eq(listView.ipAddress, hashedIp) : undefined,
          ),
        ),
      );

    if (existingView.length > 0) {
      return {
        success: true,
        alreadyViewed: true,
        message: "View already logged within the last 24 hours.",
      };
    }

    await db.insert(listView).values({
      listId,
      userId: userId || null,
      ipAddress: hashedIp,
    });

    return {
      success: true,
      alreadyViewed: false,
      message: "View logged successfully.",
    };
  } catch (error) {
    console.error("Error occurred while tracking list view", error);
    return {
      success: false,
      alreadyViewed: false,
      message: "An error occurred while logging the view.",
    };
  }
}
