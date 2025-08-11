import { Elysia } from "elysia";
import { trending } from "./trending";
import { details } from "./details";
import { lists } from "./lists";
import { listItems } from "./list-items";
import { reviews } from "./reviews";
import { actions } from "./actions";
import { user } from "./user";

export const v1 = new Elysia({ name: "apiV1", prefix: "/v1" })
  .use(actions)
  .use(details)
  .use(lists)
  .use(listItems)
  .use(reviews)
  .use(trending)
  .use(user);
