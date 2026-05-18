/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
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
            }>,
            Name
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
            any,
            Name
          >;
        };
      };
      groups: {
        assign: {
          assignTeamToGroup: FunctionReference<
            "mutation",
            "internal",
            { groupId: string; teamId: string },
            any,
            Name
          >;
        };
        create: {
          createGroup: FunctionReference<
            "mutation",
            "internal",
            { name: string; tournamentCategoryId: string },
            any,
            Name
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
            }>,
            Name
          >;
        };
      };
      matches: {
        delete: {
          deleteMatchesByGroupId: FunctionReference<
            "mutation",
            "internal",
            { groupId: string },
            any,
            Name
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
            any,
            Name
          >;
        };
        generate: {
          generateMatches: FunctionReference<
            "mutation",
            "internal",
            { groupId: string },
            any,
            Name
          >;
        };
        get: {
          getLiveMatchesByTournamentId: FunctionReference<
            "query",
            "internal",
            { tournamentId: string },
            Array<{
              _id: string;
              categoryId?: string;
              categoryName?: string;
              groupId?: string;
              groupName?: string;
              points: { teamA: number; teamB: number };
              scheduledAt?: string;
              sets: Array<{ teamAPoints: number; teamBPoints: number }>;
              stage?: string;
              status: "scheduled" | "in_progress" | "finished";
              teams: Array<{
                name: string;
                players: Array<{
                  firstName?: string;
                  lastName: string;
                  name: string;
                }>;
              }>;
            }>,
            Name
          >;
          getMatchByPlayerName: FunctionReference<
            "query",
            "internal",
            { playerName: string },
            Array<{
              _id: string;
              categoryId?: string;
              categoryName?: string;
              groupId?: string;
              groupName?: string;
              points: { teamA: number; teamB: number };
              scheduledAt?: string;
              sets: Array<{ teamAPoints: number; teamBPoints: number }>;
              stage?: string;
              status: "scheduled" | "in_progress" | "finished";
              teams: Array<{
                name: string;
                players: Array<{
                  firstName?: string;
                  lastName: string;
                  name: string;
                }>;
              }>;
            }>,
            Name
          >;
          getMatchesByGroupId: FunctionReference<
            "query",
            "internal",
            { groupId: string; teamName?: string },
            Array<{
              _id: string;
              categoryId?: string;
              categoryName?: string;
              groupId?: string;
              groupName?: string;
              points: { teamA: number; teamB: number };
              scheduledAt?: string;
              sets: Array<{ teamAPoints: number; teamBPoints: number }>;
              stage?: string;
              status: "scheduled" | "in_progress" | "finished";
              teams: Array<{
                name: string;
                players: Array<{
                  firstName?: string;
                  lastName: string;
                  name: string;
                }>;
              }>;
            }>,
            Name
          >;
          getTodayCompletedMatchesByTournamentId: FunctionReference<
            "query",
            "internal",
            { tournamentId: string },
            Array<{
              _id: string;
              categoryId?: string;
              categoryName?: string;
              groupId?: string;
              groupName?: string;
              points: { teamA: number; teamB: number };
              scheduledAt?: string;
              sets: Array<{ teamAPoints: number; teamBPoints: number }>;
              stage?: string;
              status: "scheduled" | "in_progress" | "finished";
              teams: Array<{
                name: string;
                players: Array<{
                  firstName?: string;
                  lastName: string;
                  name: string;
                }>;
              }>;
            }>,
            Name
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
            any,
            Name
          >;
        };
        get: {
          byFullName: FunctionReference<
            "query",
            "internal",
            { firstName: string; lastName: string },
            any,
            Name
          >;
          search: FunctionReference<
            "query",
            "internal",
            { query: string },
            any,
            Name
          >;
        };
      };
      teams: {
        create: {
          default: FunctionReference<
            "mutation",
            "internal",
            { image?: string; name: string; playersIds: Array<string> },
            any,
            Name
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
            }>,
            Name
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
            any,
            Name
          >;
        };
        get: {
          bySlug: FunctionReference<
            "query",
            "internal",
            { slug: string },
            any,
            Name
          >;
        };
        teams: {
          add: {
            default: FunctionReference<
              "mutation",
              "internal",
              { teamId: string; tournamentCategoryId: string },
              any,
              Name
            >;
          };
          update: {
            sync: FunctionReference<
              "mutation",
              "internal",
              { tournamentId: string },
              any,
              Name
            >;
          };
        };
      };
    };
  };
