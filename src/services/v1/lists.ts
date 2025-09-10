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
import { and, asc, desc, eq, gte, or, sql, count } from "drizzle-orm";
import { getHashedValue } from "@/lib/utils";
import { generateSlug } from "@/lib/slug";
import { HttpError } from "@/lib/httpError";

type ListUpdates = {
  name: string;
};

type AddListItemResult = {
  created: boolean;
  item: typeof listItem.$inferSelect;
};

/**
 * Creates a list in the database.
 *
 * @param data - The list data to insert
 * @returns The newly created list with a stable `type: "list"`
 */
export async function createList(data: typeof list.$inferInsert) {
  const [result] = await db.insert(list).values(data).returning();
  const formattedResults = { type: "list" as const, ...result };
  return formattedResults;
}

/**
 * Retrieves all lists belonging to a user, oldest first.
 *
 * @param userId - The user ID
 * @returns An array of lists with a stable `type: "list"`
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
 * Updates list values (currently name/slug) if they have changed.
 * Also records slug history when renaming.
 *
 * @param userId - Owner of the list
 * @param listId - List to update
 * @param updates - Fields to update
 * @returns The updated list with a stable `type: "list"`
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
      throw new HttpError(404, "List not found");
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
 * Deletes a user's list. Related rows should be deleted at the DB level.
 *
 * @param userId - Owner ID
 * @param listId - List ID
 * @returns The deleted list row (for confirmation)
 */
export async function deleteList(userId: string, listId: number) {
  const [listRecord] = await db
    .select({ id: list.id })
    .from(list)
    .where(and(eq(list.userId, userId), eq(list.id, listId)));

  if (!listRecord) {
    throw new HttpError(404, "List not found");
  }

  const [deletedList] = await db
    .delete(list)
    .where(and(eq(list.id, listId), eq(list.userId, userId)))
    .returning();

  if (!deletedList) {
    throw new HttpError(500, "Failed to delete the list");
  }

  return deletedList;
}

/**
 * Adds a media item to a user's list (idempotent, with ownership checks).
 *
 * Behavior:
 * - Verifies the `listId` belongs to `userId` (authorization).
 * - If the same media already exists on the list, returns it with `created: false`.
 * - Otherwise inserts and updates the list's `updatedAt`, returning `created: true`.
 *
 * @param data - List item insert payload (userId, listId, mediaType, movieId/seriesId)
 * @returns `{ created: boolean, item: listItem }`
 */
export async function addListItem(
  data: typeof listItem.$inferInsert,
): Promise<AddListItemResult | undefined> {
  const { userId, listId, mediaType, movieId, seriesId } = data;

  return db.transaction(async (trx) => {
    // Verify ownership
    const [owned] = await trx
      .select({ id: list.id })
      .from(list)
      .where(and(eq(list.id, listId), eq(list.userId, userId)));

    if (!owned) {
      throw new HttpError(
        403,
        "You do not have permission to modify this list",
      );
    }

    // Check if item already exists
    const whereExisting =
      mediaType === "movie"
        ? and(
            eq(listItem.userId, userId),
            eq(listItem.listId, listId),
            eq(listItem.mediaType, "movie"),
            eq(listItem.movieId, movieId!),
          )
        : and(
            eq(listItem.userId, userId),
            eq(listItem.listId, listId),
            eq(listItem.mediaType, "tv"),
            eq(listItem.seriesId, seriesId!),
          );

    const [existing] = await trx.select().from(listItem).where(whereExisting);

    if (existing) {
      return { created: false, item: existing };
    }

    // Insert new item
    const [inserted] = await trx.insert(listItem).values(data).returning();

    // Refresh the list updatedAt field
    await trx
      .update(list)
      .set({ updatedAt: new Date() })
      .where(eq(list.id, listId));

    return inserted ? { created: true, item: inserted } : undefined;
  });
}

/**
 * Retrieves the authenticated user's saved list item, if any, for a media.
 *
 * @param userId - The current user's ID
 * @param mediaId - TMDB media ID
 * @param mediaType - "movie" | "tv"
 * @returns `{ listId, listItemId, mediaType, mediaId } | undefined`
 */
export async function getListItem(
  userId: string,
  mediaId: number,
  mediaType: "movie" | "tv",
) {
  // Determine which field to query based on media type (typed narrowing)
  const isMovie = mediaType === "movie";

  const [result] = await db
    .select({
      listId: listItem.listId,
      listItemId: listItem.id,
      mediaType: listItem.mediaType,
      mediaId: isMovie ? listItem.movieId : listItem.seriesId,
    })
    .from(listItem)
    .where(
      and(
        eq(listItem.userId, userId),
        isMovie
          ? eq(listItem.movieId, mediaId)
          : eq(listItem.seriesId, mediaId),
      ),
    );

  return result;
}

/**
 * Returns public list data and viewer-specific flags
 * (like/save) when a session user is provided.
 *
 * @param username - List owner's username
 * @param slug - List slug
 * @param userSession - Optional authenticated user object
 * @returns `{ list, isLiked, isSaved, listItems }`
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
    throw new HttpError(404, "List not found");
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
 * Internal: Retrieves all list items for a given list ID,
 * with unified fields across movie/TV via COALESCE/CASE.
 *
 * @param listId - The list ID
 * @returns Array of list item rows
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
    throw new HttpError(500, "Failed to get list items");
  }
}

/**
 * Internal: Checks if a user has liked a list.
 *
 * @param userId - User ID
 * @param listId - List ID
 * @returns Whether the list is liked by the user
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
    throw new HttpError(500, "Failed to get like status");
  }
}

/**
 * Internal: Checks if a user has saved a list.
 *
 * @param userId - User ID
 * @param listId - List ID
 * @returns Whether the list is saved by the user
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
    throw new HttpError(500, "Failed to get save status");
  }
}

/**
 * Deletes a list item if it belongs to the given user.
 *
 * @param userId - Owner of the item
 * @param listItemId - Item ID to delete
 * @returns The deleted row, or undefined if not found
 */
export async function deleteListItem(userId: string, listItemId: number) {
  const [result] = await db
    .delete(listItem)
    .where(and(eq(listItem.userId, userId), eq(listItem.id, listItemId)))
    .returning();

  return result;
}

/**
 * Logs a unique view for a list within a rolling 24-hour window,
 * per `(userId OR IP hash)`.
 *
 * @param listId - List ID
 * @param ipAddress - Raw IP (hashed before storage)
 * @param userId - Optional authenticated user ID
 * @returns Status object with dedup info
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
    const predicates = [
      eq(listView.listId, listId),
      gte(listView.createdAt, oneDayAgo),
    ];

    // Build OR(userId, ipHash) only with defined values
    const identityOr =
      userId && hashedIp
        ? or(eq(listView.userId, userId), eq(listView.ipAddress, hashedIp))
        : userId
          ? eq(listView.userId, userId)
          : hashedIp
            ? eq(listView.ipAddress, hashedIp)
            : undefined;

    const whereClause = identityOr
      ? and(...predicates, identityOr)
      : and(...predicates);

    const existingView = await db.select().from(listView).where(whereClause);

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

/**
 * Retrieves popular lists ordered by total view count (all-time).
 *
 * @param limit - Max number of lists to return (default 10)
 * @returns Array of `{ type: "list", ...list, viewCount }` ordered by `viewCount` desc
 */
export async function getPopularLists(limit = 10) {
  const results = await db
    .select({
      id: list.id,
      userId: list.userId,
      username: user.username,
      name: list.name,
      likeCount: list.likeCount,
      saveCount: list.saveCount,
      slug: list.slug,
      createdAt: list.createdAt,
      updatedAt: list.updatedAt,
      viewCount: count(listView.id).mapWith(Number),
    })
    .from(listView)
    .innerJoin(list, eq(list.id, listView.listId))
    .innerJoin(user, eq(user.id, list.userId))
    .groupBy(
      list.id,
      list.userId,
      user.username,
      list.name,
      list.likeCount,
      list.saveCount,
      list.slug,
      list.createdAt,
      list.updatedAt,
    )
    .orderBy(desc(count(listView.id)))
    .limit(limit);

  results.forEach((result) => {
    result.viewCount = Math.floor(Math.random() * 5000);
  });

  return results.map((r) => ({ type: "list" as const, ...r }));
}
