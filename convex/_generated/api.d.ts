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
import type * as modules_tournaments_categories_get from "../modules/tournaments/categories/get.js";
import type * as modules_tournaments_get from "../modules/tournaments/get.js";
import type * as modules_tournaments_groups_get from "../modules/tournaments/groups/get.js";
import type * as modules_tournaments_matches_get from "../modules/tournaments/matches/get.js";
import type * as modules_tournaments_players_add from "../modules/tournaments/players/add.js";
import type * as modules_tournaments_teams_get from "../modules/tournaments/teams/get.js";
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
  "modules/tournaments/categories/get": typeof modules_tournaments_categories_get;
  "modules/tournaments/get": typeof modules_tournaments_get;
  "modules/tournaments/groups/get": typeof modules_tournaments_groups_get;
  "modules/tournaments/matches/get": typeof modules_tournaments_matches_get;
  "modules/tournaments/players/add": typeof modules_tournaments_players_add;
  "modules/tournaments/teams/get": typeof modules_tournaments_teams_get;
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
      categories: {
        get: {
          byTournamentId: FunctionReference<
            "query",
            "internal",
            { tournamentId: string },
            Array<{
              _creationTime: number;
              _id: string;
              currentStage:
                | "group"
                | "quarter"
                | "semi"
                | "final"
                | "completed";
              icon?: string;
              name: string;
              slug: string;
              teams: Array<{
                _creationTime: number;
                _id: string;
                teamId: string;
                tournamentCategoryId: string;
              }>;
              tournamentId: string;
            }>
          >;
        };
        new: {
          default: FunctionReference<
            "mutation",
            "internal",
            {
              currentStage?:
                | "group"
                | "quarter"
                | "semi"
                | "final"
                | "completed";
              name: string;
              tournamentId: string;
            },
            any
          >;
        };
      };
      groups: {
        assign: {
          assignTeamToGroup: FunctionReference<
            "mutation",
            "internal",
            { groupId: string; teamId: string },
            any
          >;
        };
        create: {
          createGroup: FunctionReference<
            "mutation",
            "internal",
            { name: string; tournamentCategoryId: string },
            any
          >;
        };
        get: {
          getGroupsByTournamentCategoryId: FunctionReference<
            "query",
            "internal",
            { tournamentCategoryId: string },
            Array<{
              _creationTime: number;
              _id: string;
              name: string;
              tournamentCategoryId: string;
            }>
          >;
        };
      };
      matches: {
        delete: {
          deleteMatchesByGroupId: FunctionReference<
            "mutation",
            "internal",
            { groupId: string },
            any
          >;
        };
        edit: {
          editByTeamIds: FunctionReference<
            "mutation",
            "internal",
            {
              data: any;
              team1Id: string;
              team2Id: string;
              tournamentId: string;
            },
            any
          >;
        };
        generate: {
          generateMatches: FunctionReference<
            "mutation",
            "internal",
            { groupId: string },
            any
          >;
        };
        get: {
          getMatchByPlayerName: FunctionReference<
            "query",
            "internal",
            { playerName: string },
            Array<{
              _id: string;
              points: { teamA: number; teamB: number };
              scheduledAt?: string;
              sets: Array<{ teamAPoints: number; teamBPoints: number }>;
              status: "scheduled" | "in_progress" | "finished";
              teams: Array<{
                name: string;
                players: Array<{
                  firstName?: string;
                  lastName: string;
                  name: string;
                }>;
              }>;
            }>
          >;
          getMatchesByGroupId: FunctionReference<
            "query",
            "internal",
            { groupId: string; teamName?: string },
            Array<{
              _id: string;
              points: { teamA: number; teamB: number };
              scheduledAt?: string;
              sets: Array<{ teamAPoints: number; teamBPoints: number }>;
              status: "scheduled" | "in_progress" | "finished";
              teams: Array<{
                name: string;
                players: Array<{
                  firstName?: string;
                  lastName: string;
                  name: string;
                }>;
              }>;
            }>
          >;
        };
      };
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
        get: {
          getTeamsByCategoryId: FunctionReference<
            "query",
            "internal",
            { categoryId: string },
            Array<{
              _creationTime: number;
              _id: string;
              image?: string;
              name?: string;
              players: Array<{
                _creationTime: number;
                _id: string;
                email?: string;
                firstName?: string;
                image?: string;
                lastName: string;
              }>;
              playersIds: Array<string>;
            }>
          >;
        };
      };
      tournaments: {
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
          update: {
            sync: FunctionReference<
              "mutation",
              "internal",
              { tournamentId: string },
              any
            >;
          };
        };
      };
    };
  };
};
