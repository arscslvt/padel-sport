import { v } from "convex/values";

import type { Doc } from "../../_generated/dataModel";
import { clubMutation, serverMutation } from "../../functions";
import { requirePlayer } from "../openMatches/lib";
import {
  assertPointsUnfrozen,
  closeExit,
  creditPending,
  exitDeadline,
} from "./lib";
import { POINTS_TERMS_VERSION } from "./version";

export { POINTS_TERMS_VERSION };

/**
 * L'adesione al programma punti.
 *
 * I punti non arrivano a chi non li ha chiesti: il programma è un rapporto con
 * delle regole — come si guadagnano, che i premi scadono, che lo staff può
 * correggere un errore — e quelle regole valgono solo per chi le ha accettate.
 * Finché la persona non aderisce i punti che lo staff le carica restano in
 * attesa: registrati ma non suoi, senza saldo, senza riscatti, senza mail.
 * Aderendo li riceve tutti insieme.
 *
 * `POINTS_TERMS_VERSION` (version.ts) è la data del regolamento in vigore, la
 * stessa che la pagina `/regolamento-punti` mostra in testa. Quando il
 * regolamento cambia in modo sostanziale si aggiorna la data insieme al testo:
 * chi aveva aderito alla versione precedente torna a vedere la richiesta di
 * adesione, e finché non accetta di nuovo i nuovi punti restano in attesa.
 * Quelli che ha già restano suoi.
 *
 * Dal programma si esce quando si vuole (exit.ts): per dieci giorni si può
 * ancora riscattare, poi i punti non usati decadono. Si può aderire di nuovo
 * in qualunque momento, e si riparte dalle regole in vigore.
 */

export type ProgramState =
  /** Mai aderito. */
  | "none"
  /** Ha aderito a un regolamento che nel frattempo è cambiato. */
  | "outdated"
  | "joined"
  /** Ha chiesto di uscire: niente punti nuovi, ma può ancora riscattare. */
  | "leaving"
  /** Uscito: i dieci giorni sono passati e il conto è chiuso. */
  | "left";

export function programState(
  player: Doc<"players">,
  now: number = Date.now(),
): ProgramState {
  const program = player.pointsProgram;
  if (!program) return "none";

  // La scadenza conta anche prima che il conto venga chiuso: dal minuto dopo
  // non si riscatta più, anche se il timer non è ancora passato.
  if (program.exit) {
    return program.exit.closedAt || now >= exitDeadline(program.exit)
      ? "left"
      : "leaving";
  }

  return program.version === POINTS_TERMS_VERSION ? "joined" : "outdated";
}

/** Il cliente aderisce dalla propria area personale. */
export const accept = clubMutation({
  args: { version: v.string() },
  handler: async (ctx, { version }) => {
    const player = await requirePlayer(ctx, ctx.club._id);

    // La versione la manda la pagina che il cliente ha davanti: se nel
    // frattempo il regolamento è cambiato, sta accettando un testo che non è
    // più quello in vigore, e deve rileggerlo.
    if (version !== POINTS_TERMS_VERSION) {
      throw new Error(
        "Il regolamento è stato aggiornato: ricarica la pagina e rileggilo.",
      );
    }

    // Chi rientra dopo la scadenza dell'uscita perde prima i punti che non
    // aveva usato: aderire di nuovo non deve restituirglieli.
    await closeExit(ctx, player._id);

    await ctx.db.patch(player._id, {
      pointsProgram: {
        acceptedAt: Date.now(),
        version: POINTS_TERMS_VERSION,
        via: "online",
      },
    });

    return await creditPending(ctx, player._id);
  },
});

/**
 * Lo staff registra un'adesione firmata allo sportello.
 *
 * È la strada per chi non ha un account — il socio che non apre mai il sito —
 * e per chi preferisce la carta. Il club deve conservare il modulo firmato: è
 * quello, non questa riga, a provare che la persona ha accettato.
 */
export const recordAtDesk = serverMutation({
  args: {
    playerId: v.id("players"),
    recordedByClerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, { playerId, recordedByClerkUserId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Cliente non trovato.");
    // L'adesione accredita i punti in attesa: da sospeso resterebbero fermi
    // lo stesso, ed è più chiaro registrarla alla riattivazione.
    assertPointsUnfrozen(player);

    await closeExit(ctx, playerId);

    await ctx.db.patch(playerId, {
      pointsProgram: {
        acceptedAt: Date.now(),
        version: POINTS_TERMS_VERSION,
        via: "desk",
        recordedByClerkUserId,
      },
    });

    return await creditPending(ctx, playerId);
  },
});
