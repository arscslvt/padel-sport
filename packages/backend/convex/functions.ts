import {
  type CustomCtx,
  customAction,
  customMutation,
  customQuery,
} from "convex-helpers/server/customFunctions";
import {
  type Rules,
  wrapDatabaseReader,
  wrapDatabaseWriter,
} from "convex-helpers/server/rowLevelSecurity";
import { makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";

import type { DataModel, Doc, TableNames } from "./_generated/dataModel";
import {
  type DatabaseReader,
  type DatabaseWriter,
  action,
  internalAction as rawInternalAction,
  internalMutation as rawInternalMutation,
  internalQuery as rawInternalQuery,
  mutation,
  query,
} from "./_generated/server";
import { DEFAULT_CLUB_SLUG } from "./modules/clubs/lib";
import schema from "./schema";
import { assertServer } from "./utils/serverSecret";

/**
 * Le sole porte d'ingresso del backend (docs/multi-club.md, Fase 2).
 *
 * Ogni funzione nasce da uno di questi costruttori, mai da quelli di
 * `_generated/server` (lo controlla `functions.test.ts`):
 *
 * - `clubQuery`, `clubMutation`, `clubAction`: sito, area personale, app. Il
 *   club arriva dallo slug (`clubSlug`), Padel Sport se manca: le versioni
 *   dell'app già installate non lo mandano.
 * - `serverQuery`, `serverMutation`: chiamate dai server Next col segreto
 *   condiviso. Il gestionale dice l'organizzazione Clerk (`clerkOrgId`), le
 *   route del sito lo slug.
 * - `internalQuery`, `internalMutation`, `internalAction`: cron, scheduler e
 *   webhook. Non filtrano per club: chi le chiama ha già scelto la riga, e il
 *   club si legge da lì (`clubId` del record).
 *
 * Nelle prime due famiglie `ctx.club` è il club di chi chiama e `ctx.db`
 * vede solo le sue righe: una riga di un altro club per `get` non esiste, nelle
 * query non compare, e scriverla fallisce. In manutenzione (`clubs.maintenance`)
 * le scritture si fermano, tranne per gli amministratori della piattaforma.
 */

/** Il codice che sito, gestionale e app riconoscono per «torniamo subito». */
export const MAINTENANCE_ERROR = "CLUB_MAINTENANCE";

// Ogni tabella con `clubId`: tutte tranne `clubs`. L'elenco serve anche a
// `get(id)` senza tabella, che le regole riconoscono solo se la conoscono.
const CLUB_TABLES = Object.keys(schema.tables).filter(
  (table) => table !== "clubs",
) as Exclude<TableNames, "clubs">[];

function clubRules(club: Doc<"clubs">): Rules<object, DataModel> {
  type Rule = (
    ctx: object,
    doc: { _id?: string; clubId?: string },
  ) => Promise<boolean>;
  const own: Rule = async (_, doc) => doc.clubId === club._id;
  const rules: Record<string, { read: Rule; modify: Rule; insert: Rule }> = {
    clubs: {
      read: async (_, doc) => doc._id === club._id,
      modify: async () => false,
      insert: async () => false,
    },
  };
  for (const table of CLUB_TABLES) {
    rules[table] = { read: own, modify: own, insert: own };
  }
  return rules as Rules<object, DataModel>;
}

function clubReader(db: DatabaseReader, club: Doc<"clubs">): DatabaseReader {
  return wrapDatabaseReader({}, db, clubRules(club), { defaultPolicy: "deny" });
}

function clubWriter(db: DatabaseWriter, club: Doc<"clubs">): DatabaseWriter {
  const wrapped = wrapDatabaseWriter({}, db, clubRules(club), {
    defaultPolicy: "deny",
  });
  // Le regole guardano la riga com'era: senza questo controllo una patch
  // potrebbe spostarla in un altro club.
  const sameClub = (value: unknown) => {
    if (
      value &&
      typeof value === "object" &&
      "clubId" in value &&
      value.clubId !== club._id
    ) {
      throw new Error("Una riga non può cambiare club.");
    }
  };
  return {
    system: wrapped.system,
    get: wrapped.get.bind(wrapped),
    query: wrapped.query.bind(wrapped),
    normalizeId: wrapped.normalizeId.bind(wrapped),
    insert: wrapped.insert.bind(wrapped),
    delete: wrapped.delete.bind(wrapped),
    patch: ((...args: unknown[]) => {
      sameClub(args.at(-1));
      return (wrapped.patch as (...a: unknown[]) => Promise<void>)(...args);
    }) as DatabaseWriter["patch"],
    replace: ((...args: unknown[]) => {
      sameClub(args.at(-1));
      return (wrapped.replace as (...a: unknown[]) => Promise<void>)(...args);
    }) as DatabaseWriter["replace"],
  };
}

async function clubBySlug(
  db: DatabaseReader,
  slug: string = DEFAULT_CLUB_SLUG,
): Promise<Doc<"clubs">> {
  const club = await db
    .query("clubs")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();
  if (!club) throw new ConvexError("Club non trovato.");
  return club;
}

async function clubByOrg(
  db: DatabaseReader,
  clerkOrgId: string,
): Promise<Doc<"clubs">> {
  const club = await db
    .query("clubs")
    .withIndex("by_clerk_org", (q) => q.eq("clerkOrgId", clerkOrgId))
    .unique();
  if (!club) {
    throw new ConvexError("L'organizzazione dello staff non ha un club.");
  }
  return club;
}

/**
 * Gli amministratori della piattaforma, per id utente Clerk separati da
 * virgola nella variabile `PLATFORM_ADMIN_USER_IDS`: lavorano anche a club
 * in manutenzione, per le prove della Fase 3.
 */
export function isPlatformAdmin(userId: string | undefined): boolean {
  if (!userId) return false;
  return (process.env.PLATFORM_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .includes(userId);
}

function assertOpen(club: Doc<"clubs">, userId: string | undefined) {
  if (club.maintenance && !isPlatformAdmin(userId)) {
    throw new ConvexError({
      code: MAINTENANCE_ERROR,
      message: "Il club è in manutenzione. Torniamo subito.",
    });
  }
}

const clubArgs = { clubSlug: v.optional(v.string()) };

const serverArgs = {
  secret: v.string(),
  clerkOrgId: v.optional(v.string()),
  clubSlug: v.optional(v.string()),
  /** Chi dello staff chiama, per la manutenzione. */
  actorUserId: v.optional(v.string()),
};

async function serverClub(
  db: DatabaseReader,
  args: { secret: string; clerkOrgId?: string; clubSlug?: string },
) {
  assertServer(args.secret);
  return args.clerkOrgId
    ? await clubByOrg(db, args.clerkOrgId)
    : await clubBySlug(db, args.clubSlug);
}

export const clubQuery = customQuery(query, {
  args: clubArgs,
  input: async (ctx, { clubSlug }) => {
    const club = await clubBySlug(ctx.db, clubSlug);
    return { ctx: { club, db: clubReader(ctx.db, club) }, args: {} };
  },
});

export const clubMutation = customMutation(mutation, {
  args: clubArgs,
  input: async (ctx, { clubSlug }) => {
    const club = await clubBySlug(ctx.db, clubSlug);
    if (club.maintenance) {
      assertOpen(club, (await ctx.auth.getUserIdentity())?.subject);
    }
    return { ctx: { club, db: clubWriter(ctx.db, club) }, args: {} };
  },
});

export const serverQuery = customQuery(query, {
  args: serverArgs,
  input: async (ctx, args) => {
    const club = await serverClub(ctx.db, args);
    return { ctx: { club, db: clubReader(ctx.db, club) }, args: {} };
  },
});

export const serverMutation = customMutation(mutation, {
  args: serverArgs,
  input: async (ctx, args) => {
    const club = await serverClub(ctx.db, args);
    assertOpen(club, args.actorUserId);
    return { ctx: { club, db: clubWriter(ctx.db, club) }, args: {} };
  },
});

/**
 * Il club per id, per organizzazione o per slug (Padel Sport se non c'è
 * niente), per le action che non hanno `ctx.db`.
 */
const clubForActionRef = makeFunctionReference<
  "query",
  { slug?: string; clerkOrgId?: string },
  Doc<"clubs">
>("functions:clubForAction");

export const clubForAction = rawInternalQuery({
  args: {
    slug: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
    clubId: v.optional(v.id("clubs")),
  },
  handler: async (ctx, { slug, clerkOrgId, clubId }) => {
    if (clubId) {
      const club = await ctx.db.get(clubId);
      if (!club) throw new ConvexError("Club non trovato.");
      return club;
    }
    return clerkOrgId
      ? await clubByOrg(ctx.db, clerkOrgId)
      : await clubBySlug(ctx.db, slug);
  },
});

/**
 * Le action non leggono il database: `ctx.club` dice di quale club sono, e le
 * query e mutation interne che chiamano controllano che il record sia suo.
 */
export const clubAction = customAction(action, {
  args: clubArgs,
  input: async (ctx, { clubSlug }) => {
    const club = await ctx.runQuery(clubForActionRef, { slug: clubSlug });
    // Le action scrivono attraverso funzioni interne, che la manutenzione non
    // la guardano: va fermata qui, come per le mutation.
    if (club.maintenance) {
      assertOpen(club, (await ctx.auth.getUserIdentity())?.subject);
    }
    return { ctx: { club }, args: {} };
  },
});

export const serverAction = customAction(action, {
  args: serverArgs,
  input: async (ctx, args) => {
    assertServer(args.secret);
    const club = await ctx.runQuery(clubForActionRef, {
      slug: args.clubSlug,
      clerkOrgId: args.clerkOrgId,
    });
    assertOpen(club, args.actorUserId);
    return { ctx: { club }, args: {} };
  },
});

/** Senza club: cron, scheduler e webhook, che il club lo leggono dal record. */
export const internalQuery = rawInternalQuery;
export const internalMutation = rawInternalMutation;
export const internalAction = rawInternalAction;

export type ClubQueryCtx = CustomCtx<typeof clubQuery>;
export type ClubMutationCtx = CustomCtx<typeof clubMutation>;
export type ClubActionCtx = CustomCtx<typeof clubAction>;
export type ServerActionCtx = CustomCtx<typeof serverAction>;
