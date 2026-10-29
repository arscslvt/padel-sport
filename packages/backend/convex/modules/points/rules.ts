import { v } from "convex/values";

import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import {
  type ClubMutationCtx,
  serverMutation,
  serverQuery,
} from "../../functions";
import { pointRuleKey } from "../../tables/pointRules";
import { MAX_DELTA } from "./lib";

/**
 * Il catalogo delle azioni premiate in automatico, e il loro interruttore.
 *
 * Le azioni sono scritte qui perché ognuna ha il suo aggancio nel codice
 * (modules/points/auto.ts per il gioco e il pagamento online). Il gestionale
 * ne cambia i punti e le accende o le spegne, solo un amministratore.
 *
 * L'amico invitato sono due premi — a chi invita e all'amico — con due righe
 * e due valori, ma un'azione sola per chi la configura: si leggono e si
 * salvano insieme (`list`, `save`), con un interruttore unico.
 */

/**
 * «Prima partita» è un benvenuto ai clienti nuovi: vale solo per le schede
 * create da qui in poi (16/10/2026, 21:30 ora del club).
 *
 * Le schede precedenti sono i clienti che il club aveva già quando il portale
 * è partito: molti giocavano da anni senza una prenotazione registrata, e il
 * controllo sulle prenotazioni (`pointRules.since`) non bastava a
 * riconoscerli.
 *
 * Anche dopo quella data lo staff può registrare chi era già cliente ma non
 * aveva ancora la scheda: `existingClient` lo tiene fuori.
 */
export const FIRST_MATCH_NEWCOMERS_SINCE = Date.parse(
  "2026-10-16T21:30:00+02:00",
);

export function isFirstMatchNewcomer(player: Doc<"players">): boolean {
  return (
    player.createdAt >= FIRST_MATCH_NEWCOMERS_SINCE && !player.existingClient
  );
}

/** Il premio all'amico invitato: vive dentro «Amico invitato». */
const PAIRED: Partial<Record<PointRuleKey, PointRuleKey>> = {
  referral: "referral_welcome",
};
const isPaired = (key: PointRuleKey) =>
  Object.values(PAIRED).includes(key);

export type PointRuleKey = Doc<"pointRules">["key"];

export interface PointRuleDefinition {
  key: PointRuleKey;
  /** Il nome del movimento: è quello che il cliente legge nel suo storico. */
  label: string;
  /** Cosa la fa scattare, per chi la configura. */
  description: string;
  defaultPoints: number;
}

export const POINT_RULES: readonly PointRuleDefinition[] = [
  {
    key: "first_match",
    label: "Prima partita",
    description:
      "Alla prima prenotazione confermata dallo staff, dal sito o dal gestionale. Solo per i clienti nuovi, con la scheda creata dal 16 ottobre 2026.",
    defaultPoints: 10,
  },
  {
    key: "weekly_three",
    label: "3 partite in una settimana",
    description:
      "Quando un cliente ha almeno 3 prenotazioni confermate nella stessa settimana, da lunedì a domenica.",
    defaultPoints: 3,
  },
  {
    key: "online_payment",
    label: "Pagamento online",
    description:
      "A chi prenota, per ogni prenotazione pagata online. Se viene rimborsata o annullata, i punti tornano indietro.",
    defaultPoints: 1,
  },
  {
    key: "referral",
    label: "Amico invitato",
    description:
      "A chi ha invitato un amico e all'amico stesso, quando l'amico paga la sua prima tessera in struttura.",
    defaultPoints: 5,
  },
  {
    key: "referral_welcome",
    label: "Benvenuto da un amico",
    description:
      "A chi si iscrive su invito di un cliente, quando paga la sua prima tessera in struttura.",
    defaultPoints: 5,
  },
];

export function ruleDefinition(key: PointRuleKey): PointRuleDefinition {
  const rule = POINT_RULES.find((row) => row.key === key);
  if (!rule) throw new Error(`Azione premiata sconosciuta: ${key}`);
  return rule;
}

export async function ruleRow(
  ctx: QueryCtx,
  clubId: Id<"clubs">,
  key: PointRuleKey,
) {
  return await ctx.db
    .query("pointRules")
    .withIndex("by_club_key", (q) => q.eq("clubId", clubId).eq("key", key))
    .first();
}

/** La regola se è accesa, `null` se è spenta o mai configurata. */
export async function activeRule(
  ctx: QueryCtx,
  clubId: Id<"clubs">,
  key: PointRuleKey,
) {
  const row = await ruleRow(ctx, clubId, key);
  return row?.enabled ? row : null;
}

function assertRulePoints(points: number) {
  if (!Number.isInteger(points) || points < 1) {
    throw new Error("I punti di un'azione sono un numero intero da 1 in su.");
  }
  if (points > MAX_DELTA) {
    throw new Error(`Un'azione non può valere più di ${MAX_DELTA} punti.`);
  }
}

export const list = serverQuery({
  args: {},
  handler: async (ctx) => {
    return await Promise.all(
      POINT_RULES.filter((rule) => !isPaired(rule.key)).map(async (rule) => {
        const row = await ruleRow(ctx, ctx.club._id, rule.key);
        const pairedKey = PAIRED[rule.key];
        const paired = pairedKey
          ? await ruleRow(ctx, ctx.club._id, pairedKey)
          : null;
        return {
          key: rule.key,
          label: rule.label,
          description: rule.description,
          points: row?.points ?? rule.defaultPoints,
          /** I punti dell'altro premio della stessa azione (l'amico invitato). */
          friendPoints: pairedKey
            ? (paired?.points ?? ruleDefinition(pairedKey).defaultPoints)
            : undefined,
          enabled: row?.enabled ?? false,
          since: row?.since,
        };
      }),
    );
  },
});

export const save = serverMutation({
  args: {
    key: pointRuleKey,
    points: v.float64(),
    /** Per «Amico invitato»: i punti all'amico. Senza, restano quelli di prima. */
    friendPoints: v.optional(v.float64()),
    enabled: v.boolean(),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    ruleDefinition(args.key);
    if (isPaired(args.key)) {
      throw new Error("Questi punti si cambiano da «Amico invitato».");
    }
    assertRulePoints(args.points);
    if (args.friendPoints !== undefined) assertRulePoints(args.friendPoints);

    const pairedKey = PAIRED[args.key];
    if (pairedKey) {
      const paired = await ruleRow(ctx, ctx.club._id, pairedKey);
      await writeRule(ctx, pairedKey, {
        points:
          args.friendPoints ??
          paired?.points ??
          ruleDefinition(pairedKey).defaultPoints,
        enabled: args.enabled,
        clerkUserId: args.clerkUserId,
      });
    }

    return await writeRule(ctx, args.key, args);
  },
});

/**
 * Cambiare i punti vale da qui in avanti: chi li ha già ricevuti tiene quelli
 * del giorno in cui li ha guadagnati.
 */
async function writeRule(
  ctx: ClubMutationCtx,
  key: PointRuleKey,
  { points, enabled, clerkUserId }: {
    points: number;
    enabled: boolean;
    clerkUserId?: string;
  },
) {
  const now = Date.now();
  const row = await ruleRow(ctx, ctx.club._id, key);

  if (row) {
    await ctx.db.patch(row._id, {
      points,
      enabled,
      updatedAt: now,
      updatedByClerkUserId: clerkUserId,
    });
    return row._id;
  }

  return await ctx.db.insert("pointRules", {
    clubId: ctx.club._id,
    key,
    points,
    enabled,
    since: now,
    updatedAt: now,
    updatedByClerkUserId: clerkUserId,
  });
}
