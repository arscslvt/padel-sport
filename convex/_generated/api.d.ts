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
import type * as modules_tournaments_get from "../modules/tournaments/get.js";
import type * as modules_tournaments_players_add from "../modules/tournaments/players/add.js";
import type * as slots_listActive from "../slots/listActive.js";
import type * as tables_bookings from "../tables/bookings.js";
import type * as tables_events from "../tables/events.js";
import type * as tables_links from "../tables/links.js";
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
  "modules/tournaments/get": typeof modules_tournaments_get;
  "modules/tournaments/players/add": typeof modules_tournaments_players_add;
  "slots/listActive": typeof slots_listActive;
  "tables/bookings": typeof tables_bookings;
  "tables/events": typeof tables_events;
  "tables/links": typeof tables_links;
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
  tournaments: {
    modules: {
      players: {
        add: {
          default: FunctionReference<
            "mutation",
            "internal",
            {
              email?: string;
              firstName: string;
              image?: string;
              lastName: string;
            },
            any
          >;
        };
        get: {
          byFullName: FunctionReference<
            "query",
            "internal",
            { firstName: string; lastName: string },
            any
          >;
          search: FunctionReference<
            "query",
            "internal",
            { query: string },
            any
          >;
        };
      };
      teams: {
        create: {
          default: FunctionReference<
            "mutation",
            "internal",
            { image?: string; name: string; playersIds: Array<string> },
            any
          >;
        };
      };
      tournaments: {
        categories: {
          new: {
            default: FunctionReference<
              "mutation",
              "internal",
              { name: string; tournamentId: string },
              any
            >;
          };
        };
        create: {
          default: FunctionReference<
            "mutation",
            "internal",
            {
              endDate?: string;
              name: string;
              slug?: string;
              startDate: string;
            },
            any
          >;
        };
        get: {
          bySlug: FunctionReference<"query", "internal", { slug: string }, any>;
        };
        teams: {
          add: {
            default: FunctionReference<
              "mutation",
              "internal",
              { teamId: string; tournamentCategoryId: string },
              any
            >;
          };
        };
      };
    };
  };
};
