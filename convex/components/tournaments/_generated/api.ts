/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as modules_categories_get from "../modules/categories/get.js";
import type * as modules_categories_new from "../modules/categories/new.js";
import type * as modules_groups_assign from "../modules/groups/assign.js";
import type * as modules_groups_create from "../modules/groups/create.js";
import type * as modules_groups_get from "../modules/groups/get.js";
import type * as modules_matches_delete from "../modules/matches/delete.js";
import type * as modules_matches_edit from "../modules/matches/edit.js";
import type * as modules_matches_generate from "../modules/matches/generate.js";
import type * as modules_matches_get from "../modules/matches/get.js";
import type * as modules_players_add from "../modules/players/add.js";
import type * as modules_players_get from "../modules/players/get.js";
import type * as modules_teams_create from "../modules/teams/create.js";
import type * as modules_teams_get from "../modules/teams/get.js";
import type * as modules_tournaments_create from "../modules/tournaments/create.js";
import type * as modules_tournaments_edit from "../modules/tournaments/edit.js";
import type * as modules_tournaments_get from "../modules/tournaments/get.js";
import type * as modules_tournaments_teams_add from "../modules/tournaments/teams/add.js";
import type * as modules_tournaments_teams_update from "../modules/tournaments/teams/update.js";
import type * as tables_groupStandings from "../tables/groupStandings.js";
import type * as tables_groupTeams from "../tables/groupTeams.js";
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
  "modules/categories/get": typeof modules_categories_get;
  "modules/categories/new": typeof modules_categories_new;
  "modules/groups/assign": typeof modules_groups_assign;
  "modules/groups/create": typeof modules_groups_create;
  "modules/groups/get": typeof modules_groups_get;
  "modules/matches/delete": typeof modules_matches_delete;
  "modules/matches/edit": typeof modules_matches_edit;
  "modules/matches/generate": typeof modules_matches_generate;
  "modules/matches/get": typeof modules_matches_get;
  "modules/players/add": typeof modules_players_add;
  "modules/players/get": typeof modules_players_get;
  "modules/teams/create": typeof modules_teams_create;
  "modules/teams/get": typeof modules_teams_get;
  "modules/tournaments/create": typeof modules_tournaments_create;
  "modules/tournaments/edit": typeof modules_tournaments_edit;
  "modules/tournaments/get": typeof modules_tournaments_get;
  "modules/tournaments/teams/add": typeof modules_tournaments_teams_add;
  "modules/tournaments/teams/update": typeof modules_tournaments_teams_update;
  "tables/groupStandings": typeof tables_groupStandings;
  "tables/groupTeams": typeof tables_groupTeams;
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
