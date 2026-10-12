import type { Doc, Id } from "../../_generated/dataModel";
import type { QueryCtx } from "../../_generated/server";
import { isMembershipValid, membershipStatus } from "../clients/lib";

/**
 * Il listino visto dal codice: cosa si prenota, quanto costa, chi paga meno.
 *
 * I prezzi li muove il club dalla dashboard (tables/services.ts); qui stanno
 * nome e descrizione di ogni servizio e il prezzo di partenza, quello che fino
 * a ieri era cablato nel codice. Finché nessuno apre il listino, si paga come
 * prima.
 */

export type ServiceKind = Doc<"services">["kind"];

export interface ServicePrice {
  kind: ServiceKind;
  name: string;
  description: string;
  /** Euro a giocatore. */
  price: number;
  /** Euro a giocatore per chi ha la tessera valida. Assente: stesso prezzo. */
  memberPrice?: number;
}

/** Quello che del servizio non cambia dalla dashboard. */
export const SERVICE_CATALOG: Record<
  ServiceKind,
  { name: string; description: string; defaultPrice: number }
> = {
  match: {
    name: "Partita di padel",
    description: "Un campo per 90 minuti, prezzo a giocatore",
    defaultPrice: 7,
  },
};

export const SERVICE_KINDS = Object.keys(SERVICE_CATALOG) as ServiceKind[];

/** Il tetto di un prezzo: oltre è quasi certamente un errore di battitura. */
export const MAX_PRICE = 500;

/** Euro con due decimali: i centesimi sono l'unità vera del denaro. */
export function roundEuro(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Un importo in euro che si può scrivere in centesimi interi, senza resto. */
export function isWholeCents(value: number): boolean {
  return Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
}

/** "7 €", "7,50 €": i centesimi solo quando ci sono. */
export function formatEuro(value: number): string {
  const whole = Number.isInteger(roundEuro(value));

  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export async function servicePrice(
  ctx: QueryCtx,
  kind: ServiceKind,
): Promise<ServicePrice> {
  const row = await ctx.db
    .query("services")
    .withIndex("by_kind", (q) => q.eq("kind", kind))
    .first();

  const { name, description, defaultPrice } = SERVICE_CATALOG[kind];

  return {
    kind,
    name,
    description,
    price: row?.price ?? defaultPrice,
    memberPrice: row?.memberPrice,
  };
}

export async function priceList(ctx: QueryCtx): Promise<ServicePrice[]> {
  return await Promise.all(
    SERVICE_KINDS.map((kind) => servicePrice(ctx, kind)),
  );
}

/** I prezzi da scrivere su una prenotazione nuova. */
export interface MatchPricing {
  pricePerPlayer: number;
  /** Solo quando chi prenota paga diverso dagli altri: la tariffa tesserati. */
  bookerPricePerPlayer?: number;
}

/**
 * Quanto costa la partita per chi la prenota e per gli altri.
 *
 * Il prezzo si fotografa sulla prenotazione: cambiare listino domani non deve
 * cambiare quanto deve chi ha prenotato ieri.
 *
 * La tariffa tesserati vale per chi prenota, l'unico di cui il sistema
 * conosce la tessera: dal sito i compagni sono nomi scritti a mano. A un
 * compagno tesserato lo sconto lo applica la struttura, in cassa.
 */
export async function matchPricing(
  ctx: QueryCtx,
  bookerId: Id<"players"> | undefined,
): Promise<MatchPricing> {
  const { price, memberPrice } = await servicePrice(ctx, "match");

  if (memberPrice === undefined || memberPrice === price || !bookerId) {
    return { pricePerPlayer: price };
  }

  const { state } = await membershipStatus(ctx, bookerId);
  if (!isMembershipValid(state)) return { pricePerPlayer: price };

  return { pricePerPlayer: price, bookerPricePerPlayer: memberPrice };
}

/**
 * Il totale della prenotazione per la squadra che c'è: il primo nome è chi
 * prenota, gli altri pagano il prezzo pieno.
 */
export function bookingTotal(
  booking: Pick<
    Doc<"bookings">,
    "players" | "pricePerPlayer" | "bookerPricePerPlayer"
  >,
): number {
  if (booking.players.length === 0) return 0;

  const others = booking.players.length - 1;
  const booker = booking.bookerPricePerPlayer ?? booking.pricePerPlayer;

  return roundEuro(booker + booking.pricePerPlayer * others);
}
