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
import type * as bookings_delete from "../bookings/delete.js";
import type * as bookings_get from "../bookings/get.js";
import type * as bookings_list from "../bookings/list.js";
import type * as bookings_listRange from "../bookings/listRange.js";
import type * as bookings_update from "../bookings/update.js";
import type * as events_list from "../events/list.js";
import type * as events_new from "../events/new.js";
import type * as modules_notifications_alert from "../modules/notifications/alert.js";
import type * as modules_notifications_confirmation from "../modules/notifications/confirmation.js";
import type * as modules_openMatches_create from "../modules/openMatches/create.js";
import type * as modules_openMatches_get from "../modules/openMatches/get.js";
import type * as modules_openMatches_join from "../modules/openMatches/join.js";
import type * as modules_openMatches_lib from "../modules/openMatches/lib.js";
import type * as modules_openMatches_list from "../modules/openMatches/list.js";
import type * as modules_openMatches_my from "../modules/openMatches/my.js";
import type * as modules_openMatches_players from "../modules/openMatches/players.js";
import type * as modules_openMatches_requests from "../modules/openMatches/requests.js";
import type * as modules_tournaments_advancements from "../modules/tournaments/advancements.js";
import type * as modules_tournaments_categories_get from "../modules/tournaments/categories/get.js";
import type * as modules_tournaments_edit from "../modules/tournaments/edit.js";
import type * as modules_tournaments_get from "../modules/tournaments/get.js";
import type * as modules_tournaments_groups_get from "../modules/tournaments/groups/get.js";
import type * as modules_tournaments_matches_edit from "../modules/tournaments/matches/edit.js";
import type * as modules_tournaments_matches_get from "../modules/tournaments/matches/get.js";
import type * as modules_tournaments_players_add from "../modules/tournaments/players/add.js";
import type * as modules_tournaments_teams_get from "../modules/tournaments/teams/get.js";
import type * as slots_listActive from "../slots/listActive.js";
import type * as tables_bookings from "../tables/bookings.js";
import type * as tables_events from "../tables/events.js";
import type * as tables_joinRequests from "../tables/joinRequests.js";
import type * as tables_links from "../tables/links.js";
import type * as tables_openMatches from "../tables/openMatches.js";
import type * as tables_players from "../tables/players.js";
import type * as tables_slots from "../tables/slots.js";
import type * as utils_notification_client from "../utils/notification_client.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "bookings/create": typeof bookings_create;
  "bookings/delete": typeof bookings_delete;
  "bookings/get": typeof bookings_get;
  "bookings/list": typeof bookings_list;
  "bookings/listRange": typeof bookings_listRange;
  "bookings/update": typeof bookings_update;
  "events/list": typeof events_list;
  "events/new": typeof events_new;
  "modules/notifications/alert": typeof modules_notifications_alert;
  "modules/notifications/confirmation": typeof modules_notifications_confirmation;
  "modules/openMatches/create": typeof modules_openMatches_create;
  "modules/openMatches/get": typeof modules_openMatches_get;
  "modules/openMatches/join": typeof modules_openMatches_join;
  "modules/openMatches/lib": typeof modules_openMatches_lib;
  "modules/openMatches/list": typeof modules_openMatches_list;
  "modules/openMatches/my": typeof modules_openMatches_my;
  "modules/openMatches/players": typeof modules_openMatches_players;
  "modules/openMatches/requests": typeof modules_openMatches_requests;
  "modules/tournaments/advancements": typeof modules_tournaments_advancements;
  "modules/tournaments/categories/get": typeof modules_tournaments_categories_get;
  "modules/tournaments/edit": typeof modules_tournaments_edit;
  "modules/tournaments/get": typeof modules_tournaments_get;
  "modules/tournaments/groups/get": typeof modules_tournaments_groups_get;
  "modules/tournaments/matches/edit": typeof modules_tournaments_matches_edit;
  "modules/tournaments/matches/get": typeof modules_tournaments_matches_get;
  "modules/tournaments/players/add": typeof modules_tournaments_players_add;
  "modules/tournaments/teams/get": typeof modules_tournaments_teams_get;
  "slots/listActive": typeof slots_listActive;
  "tables/bookings": typeof tables_bookings;
  "tables/events": typeof tables_events;
  "tables/joinRequests": typeof tables_joinRequests;
  "tables/links": typeof tables_links;
  "tables/openMatches": typeof tables_openMatches;
  "tables/players": typeof tables_players;
  "tables/slots": typeof tables_slots;
  "utils/notification_client": typeof utils_notification_client;
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

export declare const components: {
  tournaments: import("../components/tournaments/_generated/component.js").ComponentApi<"tournaments">;
};
