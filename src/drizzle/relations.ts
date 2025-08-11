import { relations } from "drizzle-orm/relations";
import {
  list,
  listSaves,
  user,
  listView,
  listLikes,
  subscription,
  session,
  account,
  listItem,
  movie,
  tv,
  listSlugHistory,
  tvReview,
  movieReview,
} from "./schema";

export const savedListRelations = relations(listSaves, ({ one }) => ({
  list: one(list, {
    fields: [listSaves.listId],
    references: [list.id],
  }),
  user: one(user, {
    fields: [listSaves.userId],
    references: [user.id],
  }),
}));

export const listRelations = relations(list, ({ one, many }) => ({
  savedLists: many(listSaves),
  user: one(user, {
    fields: [list.userId],
    references: [user.id],
  }),
  listViews: many(listView),
  likedLists: many(listLikes),
  listItems: many(listItem),
  listSlugHistories: many(listSlugHistory),
}));

export const userRelations = relations(user, ({ many }) => ({
  savedLists: many(listSaves),
  lists: many(list),
  listViews: many(listView),
  likedLists: many(listLikes),
  subscriptions: many(subscription),
  sessions: many(session),
  accounts: many(account),
  tvReviews: many(tvReview),
  movieReviews: many(movieReview),
}));

export const listViewRelations = relations(listView, ({ one }) => ({
  list: one(list, {
    fields: [listView.listId],
    references: [list.id],
  }),
  user: one(user, {
    fields: [listView.userId],
    references: [user.id],
  }),
}));

export const listLikesRelations = relations(listLikes, ({ one }) => ({
  list: one(list, {
    fields: [listLikes.listId],
    references: [list.id],
  }),
  user: one(user, {
    fields: [listLikes.userId],
    references: [user.id],
  }),
}));

export const subscriptionRelations = relations(subscription, ({ one }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const listItemRelations = relations(listItem, ({ one }) => ({
  list: one(list, {
    fields: [listItem.listId],
    references: [list.id],
  }),
  movie: one(movie, {
    fields: [listItem.movieId],
    references: [movie.id],
  }),
  tv: one(tv, {
    fields: [listItem.seriesId],
    references: [tv.id],
  }),
}));

export const movieRelations = relations(movie, ({ many }) => ({
  listItems: many(listItem),
  movieReviews: many(movieReview),
}));

export const tvRelations = relations(tv, ({ many }) => ({
  listItems: many(listItem),
  tvReviews: many(tvReview),
}));

export const listSlugHistoryRelations = relations(
  listSlugHistory,
  ({ one }) => ({
    list: one(list, {
      fields: [listSlugHistory.listId],
      references: [list.id],
    }),
  }),
);

export const tvReviewRelations = relations(tvReview, ({ one }) => ({
  user: one(user, {
    fields: [tvReview.userId],
    references: [user.id],
  }),
  tv: one(tv, {
    fields: [tvReview.seriesId],
    references: [tv.id],
  }),
}));

export const movieReviewRelations = relations(movieReview, ({ one }) => ({
  user: one(user, {
    fields: [movieReview.userId],
    references: [user.id],
  }),
  movie: one(movie, {
    fields: [movieReview.movieId],
    references: [movie.id],
  }),
}));
