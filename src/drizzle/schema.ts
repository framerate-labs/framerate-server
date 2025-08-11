import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  boolean,
  check,
  date,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  username: text("username").notNull().unique(),
  displayUsername: text("display_username").unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at"),
  updatedAt: timestamp("updated_at"),
});

export const subscription = pgTable("subscription", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => user.id, {
      onUpdate: "no action",
      onDelete: "no action",
    }),
  status: text("status").notNull(),
  productId: text("product_id").notNull(),
  startDate: timestamp("start_date").notNull().defaultNow(),
  renewalDate: timestamp("renewal_date"),
  endDate: timestamp("end_date"),
});

export const movie = pgTable("movie", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  posterPath: text("poster_path").default(""),
  backdropPath: text("backdrop_path").default(""),
  releaseDate: date("release_date"),
  slug: text("slug").unique(),
});

export const movieReview = pgTable(
  "movie_review",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    movieId: bigint("movie_id", { mode: "number" })
      .notNull()
      .references(() => movie.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    mediaType: text("media_type").notNull(),
    liked: boolean("liked").notNull().default(false),
    watched: boolean("watched").notNull().default(false),
    review: text("review"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.movieId] })],
);

export const tv = pgTable("tv", {
  id: bigint("id", { mode: "number" }).primaryKey(),
  title: text("title").notNull(),
  posterPath: text("poster_path").default(""),
  backdropPath: text("backdrop_path").default(""),
  releaseDate: date("release_date").notNull(),
  slug: text("slug").unique(),
});

export const tvReview = pgTable(
  "tv_review",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    seriesId: bigint("series_id", { mode: "number" })
      .notNull()
      .references(() => tv.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" })
      .notNull()
      .defaultNow(),
    mediaType: text("media_type").notNull(),
    liked: boolean("liked").notNull().default(false),
    watched: boolean("watched").notNull().default(false),
    review: text("review"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.seriesId] })],
);

export const list = pgTable("list", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, {
      onUpdate: "no action",
      onDelete: "no action",
    }),
  name: text("name").notNull(),
  likeCount: integer("like_count").default(0).notNull(),
  saveCount: integer("save_count").default(0).notNull(),
  slug: text("slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }),
});

export const listSlugHistory = pgTable("list_slug_history", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  listId: bigint("list_id", { mode: "number" })
    .notNull()
    .references(() => list.id, {
      onUpdate: "no action",
      onDelete: "no action",
    }),
  oldSlug: text("old_slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" })
    .notNull()
    .defaultNow(),
});

export const listItem = pgTable(
  "list_item",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id").notNull(),
    listId: bigint("list_id", { mode: "number" })
      .notNull()
      .references(() => list.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    movieId: bigint("movie_id", { mode: "number" }).references(() => movie.id, {
      onUpdate: "no action",
      onDelete: "no action",
    }),
    seriesId: bigint("series_id", { mode: "number" }).references(() => tv.id, {
      onUpdate: "no action",
      onDelete: "no action",
    }),
    mediaType: text("media_type").notNull(),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("uniqueListItem").on(
      table.listId,
      table.movieId,
      table.seriesId,
    ),
  ],
);

export const listLikes = pgTable(
  "list_likes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    listId: bigint("list_id", { mode: "number" })
      .notNull()
      .references(() => list.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("uniqueUserList").on(table.userId, table.listId)],
);

export const listSaves = pgTable(
  "list_saves",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    listId: bigint("list_id", { mode: "number" })
      .notNull()
      .references(() => list.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("uniqueSavedList").on(table.userId, table.listId)],
);

export const listView = pgTable(
  "list_views",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id").references(() => user.id, {
      onUpdate: "no action",
      onDelete: "no action",
    }),
    listId: bigint("list_id", { mode: "number" })
      .notNull()
      .references(() => list.id, {
        onUpdate: "no action",
        onDelete: "no action",
      }),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", {
      withTimezone: true,
      mode: "date",
    })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "at_least_one_identifier",
      sql`${table.userId} IS NOT NULL OR ${table.ipAddress} IS NOT NULL`,
    ),
  ],
);
