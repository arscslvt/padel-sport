/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bookings_create from "../bookings/create.js";
import type * as bookings_listRange from "../bookings/listRange.js";
import type * as events_list from "../events/list.js";
import type * as events_new from "../events/new.js";
import type * as tables_bookings from "../tables/bookings.js";
import type * as tables_events from "../tables/events.js";
import type * as tables_links from "../tables/links.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "bookings/create": typeof bookings_create;
  "bookings/listRange": typeof bookings_listRange;
  "events/list": typeof events_list;
  "events/new": typeof events_new;
  "tables/bookings": typeof tables_bookings;
  "tables/events": typeof tables_events;
  "tables/links": typeof tables_links;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
