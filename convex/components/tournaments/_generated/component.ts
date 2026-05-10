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
      };
      tournaments: {
        categories: {
          new: {
            default: FunctionReference<
              "mutation",
              "internal",
              { name: string; tournamentId: string },
              any,
              Name
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
        };
      };
    };
  };
