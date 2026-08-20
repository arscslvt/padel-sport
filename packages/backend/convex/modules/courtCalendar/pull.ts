"use node";

import { internal } from "../../_generated/api";
import type { ActionCtx } from "../../_generated/server";
import { action, internalAction } from "../../_generated/server";
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
async function sync(ctx: ActionCtx) {
  const config = calendarConfig();
  if (!config) return { configured: false as const, blocks: 0, failed: false };

  const { from, to } = syncWindow();
  const blocks = await listBlocks(config, from, to);

  await ctx.runMutation(internal.modules.courtCalendar.data.applyBlocks, {
    from,
    to,
    blocks,
  });

  return { configured: true as const, blocks: blocks.length, failed: false };
}

export default internalAction({
  args: {},
  handler: async (ctx) => {
    try {
      return await sync(ctx);
    } catch (error) {
      // Un calendario irraggiungibile non deve liberare campi: le occupazioni
      // già note restano, e allo staff arriva un avviso.
      console.error("Sincronizzazione del calendario campi fallita:", error);

      await ctx.runAction(internal.modules.notifications.alert.default, {
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
export const refresh = action({
  args: {},
  handler: async (ctx) => {
    const lastSync = await ctx.runQuery(
      internal.modules.courtCalendar.data.lastSync,
      {},
    );

    if (Date.now() - lastSync < 30_000) {
      return { skipped: true as const };
    }

    try {
      await sync(ctx);
    } catch (error) {
      // Qui il silenzio è voluto: la griglia mostrata al visitatore vale anche
      // con i dati dell'ultimo giro riuscito.
      console.error("Aggiornamento del calendario campi fallito:", error);
    }

    return { skipped: false as const };
  },
});
