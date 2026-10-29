import type { Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";

/**
 * Il club di oggi, l'unico: tutto quello che nasce prima della Fase 2 della
 * migrazione multi-club (docs/multi-club.md) è suo.
 */
export const DEFAULT_CLUB_SLUG = "padel-sport";

/**
 * Il club da scrivere sulle righe nuove finché il codice non sa ancora di
 * quale club è chi chiama.
 *
 * Può tornare `undefined` nei pochi secondi fra il rilascio dello schema e la
 * creazione della riga del club (modules/clubs/seed.ts): l'inserimento non
 * deve fallire per questo, e la migrazione di riempimento
 * (modules/clubs/backfill.ts) sistema quelle righe dopo.
 */
export async function defaultClubId(
  ctx: Pick<QueryCtx, "db">,
): Promise<Id<"clubs"> | undefined> {
  const club = await ctx.db
    .query("clubs")
    .withIndex("by_slug", (q) => q.eq("slug", DEFAULT_CLUB_SLUG))
    .unique();
  return club?._id;
}

/**
 * Il club di una riga letta dal database, per le funzioni interne che non
 * hanno `ctx.club`: lo prendono dal record che stanno trattando.
 *
 * Il campo è facoltativo fino alla Fase 3, ma il riempimento l'ha messo
 * ovunque e ogni inserimento lo scrive: una riga senza è un errore, e
 * conviene fermarsi invece di leggere i dati di un club qualsiasi.
 */
export function clubOf(row: { _id: string; clubId?: Id<"clubs"> }): Id<"clubs"> {
  if (!row.clubId) throw new Error(`Riga senza club: ${row._id}.`);
  return row.clubId;
}
