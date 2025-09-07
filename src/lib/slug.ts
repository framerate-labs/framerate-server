"use server";

import { db } from "@/drizzle";
import { listSlugHistory, list, movie, tv } from "@/drizzle/schema";
import { and, eq, or } from "drizzle-orm";
import slugify from "slugify";
import { HttpError } from "@/lib/httpError";

/**
 * Generates unique slug for any content type.
 * @param title - The name to convert to a slug.
 * @param contentType - The content type the slug will belong to.
 * @returns A promise that resolves to a unique slug.
 */
export async function generateSlug(
  title: string,
  contentType: "movie" | "tv" | "list",
  userId: string,
) {
  const allowedContentTypes = ["movie", "tv", "list"];

  if (
    typeof title !== "string" ||
    title.length > 100 ||
    title === "" ||
    !allowedContentTypes.includes(contentType)
  ) {
    throw new HttpError(400, "Invalid title or content type provided.");
  }

  const baseSlug = slugify(title, { lower: true, strict: true });
  let uniqueSlug = baseSlug;
  let counter = 1;

  while (await slugExists(uniqueSlug, contentType, userId)) {
    uniqueSlug = `${baseSlug}-${counter}`;
    counter++;
  }

  return uniqueSlug;
}

/**
 * Checks if a slug exists for any content type.
 * @param uniqueSlug - The slug name to check.
 * @param contentType - The content type the slug will belong to.
 * @param userId - The user to check for slug uniqueness.
 * @returns True if slug already exists, false otherwise.
 */
async function slugExists(
  uniqueSlug: string,
  contentType: "movie" | "tv" | "list",
  userId: string,
) {
  const tableMap = { movie, tv, list };

  const table = tableMap[contentType];
  if (!table) throw new HttpError(400, "Invalid content type");

  const baseQuery = db
    .select()
    .from(table)
    .innerJoin(listSlugHistory, eq(listSlugHistory.oldSlug, uniqueSlug));

  if (contentType === "list") {
    if (!userId) {
      throw new HttpError(400, "Please provide a valid user ID.");
    }

    const result = await baseQuery.where(
      and(
        or(eq(table.slug, uniqueSlug), eq(listSlugHistory.oldSlug, uniqueSlug)),
        eq(list.userId, userId),
      ),
    );

    return result.length > 0;
  } else {
    const result = await baseQuery.where(
      or(eq(table.slug, uniqueSlug), eq(listSlugHistory.oldSlug, uniqueSlug)),
    );

    return result.length > 0;
  }
}
