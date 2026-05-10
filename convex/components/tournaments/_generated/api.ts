/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as modules_players_add from "../modules/players/add.js";
import type * as modules_players_get from "../modules/players/get.js";
import type * as modules_teams_create from "../modules/teams/create.js";
import type * as modules_tournaments_categories_new from "../modules/tournaments/categories/new.js";
import type * as modules_tournaments_create from "../modules/tournaments/create.js";
import type * as modules_tournaments_get from "../modules/tournaments/get.js";
import type * as modules_tournaments_teams_add from "../modules/tournaments/teams/add.js";
import type * as tables_groupStandings from "../tables/groupStandings.js";
import type * as tables_groups from "../tables/groups.js";
import type * as tables_matches from "../tables/matches.js";
import type * as tables_players from "../tables/players.js";
import type * as tables_teams from "../tables/teams.js";
import type * as tables_tournamentCategories from "../tables/tournamentCategories.js";
import type * as tables_tournamentTeams from "../tables/tournamentTeams.js";
import type * as tables_tournaments from "../tables/tournaments.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import { anyApi, componentsGeneric } from "convex/server";

const fullApi: ApiFromModules<{
  "modules/players/add": typeof modules_players_add;
  "modules/players/get": typeof modules_players_get;
  "modules/teams/create": typeof modules_teams_create;
  "modules/tournaments/categories/new": typeof modules_tournaments_categories_new;
  "modules/tournaments/create": typeof modules_tournaments_create;
  "modules/tournaments/get": typeof modules_tournaments_get;
  "modules/tournaments/teams/add": typeof modules_tournaments_teams_add;
  "tables/groupStandings": typeof tables_groupStandings;
  "tables/groups": typeof tables_groups;
  "tables/matches": typeof tables_matches;
  "tables/players": typeof tables_players;
  "tables/teams": typeof tables_teams;
  "tables/tournamentCategories": typeof tables_tournamentCategories;
  "tables/tournamentTeams": typeof tables_tournamentTeams;
  "tables/tournaments": typeof tables_tournaments;
}> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
> = anyApi as any;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
> = anyApi as any;

export const components = componentsGeneric() as unknown as {};
