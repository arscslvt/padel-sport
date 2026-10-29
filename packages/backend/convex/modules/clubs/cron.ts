import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { internalMutation } from "../../functions";
import { clubConfig } from "./config";

/**
 * I giri per club dei cron (docs/multi-club.md, Fase 2).
 *
 * `crons.ts` chiama queste, e ognuna programma il lavoro vero una volta per
 * club, in una funzione sua con il `clubId`: un club che fallisce non ferma
 * gli altri, e nessuna mutation deve reggere i dati di tutti insieme.
 *
 * Restano un giro solo per tutti i club i cron che partono dal singolo
 * record con scadenze uguali per tutti: l'eliminazione degli account
 * (modules/clients/deletion.ts) e la pulizia dei dati vecchi
 * (modules/privacy/retention.ts).
 */

/**
 * I club su cui far girare i cron. Quelli in manutenzione restano fermi: le
 * loro scritture sono sospese anche per chi usa il sito e il gestionale.
 */
async function openClubs(ctx: QueryCtx): Promise<Doc<"clubs">[]> {
  return (await ctx.db.query("clubs").collect()).filter(
    (club) => !club.maintenance,
  );
}

/** Le prenotazioni prese su SumUp, solo per chi ha collegato il calendario. */
export const calendar = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const club of await openClubs(ctx)) {
      if (!clubConfig(club).calendar) continue;
      await ctx.scheduler.runAfter(
        0,
        internal.modules.courtCalendar.pull.default,
        { clubId: club._id },
      );
    }
  },
});

/** Il promemoria allo staff dieci minuti prima di una partita. */
export const startingReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const club of await openClubs(ctx)) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.reminders.starting.default,
        { clubId: club._id },
      );
    }
  },
});

/** I giorni ancora senza partite: decide l'ora del club se è il momento. */
export const emptyDays = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const club of await openClubs(ctx)) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.reminders.emptyDays.default,
        { clubId: club._id },
      );
    }
  },
});

/** Il meteo al club: decide l'ora del club se è il momento di leggerlo. */
export const weather = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const club of await openClubs(ctx)) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.weather.refresh.default,
        { clubId: club._id },
      );
    }
  },
});

/** I punti in attesa che nessuno ha reclamato in un anno. */
export const pointsExpiry = internalMutation({
  args: {},
  handler: async (ctx) => {
    for (const club of await openClubs(ctx)) {
      await ctx.scheduler.runAfter(0, internal.modules.points.expire.default, {
        clubId: club._id,
      });
    }
  },
});
