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
  /**
   * La tariffa tesserati del giorno, quando il listino ne ha una diversa:
   * vale per i compagni collegati che hanno la tessera.
   */
  memberPricePerPlayer?: number;
}

/**
 * Quanto costa la partita per chi la prenota e per gli altri.
 *
 * Il prezzo si fotografa sulla prenotazione: cambiare listino domani non deve
 * cambiare quanto deve chi ha prenotato ieri.
 *
 * La tariffa tesserati vale per chi prenota e per i compagni collegati a un
 * cliente in anagrafica con la tessera (modules/pricing/members.ts). Un
 * compagno scritto solo per nome paga il prezzo pieno: se è tesserato, lo
 * sconto lo applica la struttura, in cassa.
 */
export async function matchPricing(
  ctx: QueryCtx,
  bookerId: Id<"players"> | undefined,
): Promise<MatchPricing> {
  const { price, memberPrice } = await servicePrice(ctx, "match");

  if (memberPrice === undefined || memberPrice === price) {
    return { pricePerPlayer: price };
  }

  const member =
    bookerId !== undefined &&
    isMembershipValid((await membershipStatus(ctx, bookerId)).state);

  return {
    pricePerPlayer: price,
    memberPricePerPlayer: memberPrice,
    ...(member ? { bookerPricePerPlayer: memberPrice } : {}),
  };
}

type PricedBooking = Pick<
  Doc<"bookings">,
  | "players"
  | "pricePerPlayer"
  | "bookerPricePerPlayer"
  | "memberPricePerPlayer"
  | "memberPlayers"
>;

/** Quanto deve una persona in campo. */
export interface PriceLine {
  name: string;
  price: number;
  /** Paga la tariffa tesserati. */
  member: boolean;
  /** È chi ha prenotato: il primo nome. */
  booker: boolean;
}

/**
 * Quanto deve ognuno: il primo nome è chi prenota, con la sua tariffa; degli
 * altri paga da tesserato chi è fra i giocatori collegati con la tessera
 * (`memberPlayers`), riconosciuto dal nome; tutti gli altri il prezzo pieno.
 */
export function priceLines(booking: PricedBooking): PriceLine[] {
  const [booker, ...others] = booking.players;
  if (booker === undefined) return [];

  const memberPrice =
    booking.memberPricePerPlayer ?? booking.bookerPricePerPlayer;
  // Un nome per ogni tesserato: due omonimi tesserati sono due sconti.
  const pool = (booking.memberPlayers ?? []).map((member) => member.name);

  return [
    {
      name: booker,
      price: booking.bookerPricePerPlayer ?? booking.pricePerPlayer,
      member: booking.bookerPricePerPlayer !== undefined,
      booker: true,
    },
    ...others.map((name) => {
      const index = memberPrice === undefined ? -1 : pool.indexOf(name);
      if (index !== -1) pool.splice(index, 1);
      return {
        name,
        price: index !== -1 ? (memberPrice as number) : booking.pricePerPlayer,
        member: index !== -1,
        booker: false,
      };
    }),
  ];
}

/**
 * Il totale della prenotazione per la squadra che c'è: la somma di quanto
 * deve ognuno (`priceLines`). Da qui passano la cassa, la scheda e il
 * pagamento online: un conto solo, che torna ovunque.
 */
export function bookingTotal(booking: PricedBooking): number {
  return roundEuro(
    priceLines(booking).reduce((sum, line) => sum + line.price, 0),
  );
}
