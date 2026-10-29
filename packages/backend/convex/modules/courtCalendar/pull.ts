"use node";

import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Doc } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import { clubAction, internalAction } from "../../functions";
import { calendarConfig, listBlocks } from "./client";
import { syncWindow } from "./lib";
import { STAFF_SETTINGS_URL } from "../../utils/staffLinks";


/**
 * Porta dentro le prenotazioni prese su SumUp.
 *
 * Gira ogni cinque minuti (convex/crons.ts) e, a richiesta, quando qualcuno
 * apre la scelta dell'orario sul sito: fra i due, la finestra in cui i due
 * sistemi possono litigare sullo stesso campo si riduce a poco.
 *
 * Senza configurazione non fa nulla e non è un errore: è il club che non ha
 * (ancora) collegato il calendario.
 */
/** Com'è andata: senza calendario, letto, o fallito con il motivo. */
type SyncResult =
  | { configured: false; blocks: 0; failed: false }
  | { configured: true; blocks: number; failed: false }
  | { configured: true; blocks: 0; failed: true; error: string };

async function sync(
  ctx: ActionCtx,
  club: Doc<"clubs">,
): Promise<SyncResult> {
  const config = calendarConfig(club);
  if (!config) return { configured: false as const, blocks: 0, failed: false };

  const { from, to } = syncWindow();
  const blocks = await listBlocks(config, from, to);

  await ctx.runMutation(internal.modules.courtCalendar.data.applyBlocks, {
    from,
    to,
    blocks,
    clubId: club._id,
  });

  return { configured: true as const, blocks: blocks.length, failed: false };
}

export default internalAction({
  args: {
    /**
     * Il club da sincronizzare. Senza, Padel Sport: il cron di oggi non lo
     * passa, e farà un giro per club (docs/multi-club.md, Fase 2).
     */
    clubId: v.optional(v.id("clubs")),
  },
  // Il tipo di ritorno va scritto: dedotto, Convex lo farebbe dipendere da
  // `internal`, che dipende da questo file.
  handler: async (ctx, { clubId }): Promise<SyncResult> => {
    const club: Doc<"clubs"> = await ctx.runQuery(
      internal.functions.clubForAction,
      { clubId },
    );
    try {
      return await sync(ctx, club);
    } catch (error) {
      // Un calendario irraggiungibile non deve liberare campi: le occupazioni
      // già note restano, e allo staff arriva un avviso.
      console.error("Sincronizzazione del calendario campi fallita:", error);

      await ctx.runAction(internal.modules.notifications.alert.default, {
        clubId: club._id,
        category: "system",
        title: "⚠️ Calendario campi non sincronizzato",
        message:
          "Le prenotazioni prese su SumUp potrebbero non essere aggiornate sul sito.",
        url: STAFF_SETTINGS_URL,
        // Questa gira ogni cinque minuti: con una chiave che cambia solo allo
        // scoccare dell'ora, un guasto lungo suona una volta all'ora invece di
        // dodici. Il testo qui sopra è fisso, altrimenti sarebbe un 409.
        idempotencyKey: `calendar-pull-error-${new Date().toISOString().slice(0, 13)}`,
      });

      // Il motivo torna a chi ha lanciato l'azione a mano: senza, un errore di
      // Google e un calendario vuoto darebbero la stessa risposta.
      return {
        configured: true as const,
        blocks: 0,
        failed: true as const,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
});

/**
 * Aggiornamento su richiesta, con una pausa minima fra una chiamata e l'altra:
 * è pubblica perché la invoca il browser prima di mostrare gli orari, e non
 * deve diventare un modo per bussare a Google a raffica.
 */
export const refresh = clubAction({
  args: {},
  handler: async (ctx) => {
    // Un club senza calendario non ha niente da rileggere.
    if (!calendarConfig(ctx.club)) return { skipped: true as const };

    const lastSync = await ctx.runQuery(
      internal.modules.courtCalendar.data.lastSync,
      { clubId: ctx.club._id },
    );

    if (Date.now() - lastSync < 30_000) {
      return { skipped: true as const };
    }

    try {
      await sync(ctx, ctx.club);
    } catch (error) {
      // Qui il silenzio è voluto: la griglia mostrata al visitatore vale anche
      // con i dati dell'ultimo giro riuscito.
      console.error("Aggiornamento del calendario campi fallito:", error);
    }

    return { skipped: false as const };
  },
});
