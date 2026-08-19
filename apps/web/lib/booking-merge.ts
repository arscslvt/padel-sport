import type { Doc, Id } from "@padel-sport/backend/convex/_generated/dataModel";

import { MAX_PLAYERS } from "@/lib/booking";

/**
 * Quali prenotazioni parziali si possono unire in un campo solo.
 *
 * Chi prenota può farlo senza essere in quattro: il club si impegna a trovare i
 * mancanti. Due gruppi che chiedono la stessa ora sono già quattro giocatori su
 * due campi, e questa funzione è ciò che li fa incontrare — il suggerimento che
 * lo staff prima doveva ricavare leggendo l'elenco.
 *
 * Sta qui e non in Convex perché la dashboard ha già in memoria tutte le
 * prenotazioni future: è un calcolo, non un'interrogazione, e come calcolo puro
 * si legge e si verifica senza dover simulare un database.
 */

type Booking = Doc<"bookings">;

export interface MergePair {
  keep: Booking;
  move: Booking;
  /** Stesso livello dichiarato: è la coppia che il club dovrebbe preferire. */
  suggested: boolean;
  /** Giocatori totali una volta uniti: quattro è il campo pieno. */
  players: number;
}

function isPartial(booking: Booking, now: number): boolean {
  return (
    booking.status !== "cancelled" &&
    !booking.mergedWith &&
    booking.bookingDate > now &&
    booking.players.length < MAX_PLAYERS
  );
}

/**
 * Le coppie proponibili, dalla più convincente in giù.
 *
 * Ogni prenotazione compare in una coppia sola: proporre la stessa persona in
 * tre righe diverse costringerebbe lo staff a tenere a mente quali si escludono
 * a vicenda. Vince la coppia migliore e le altre che la userebbero decadono.
 */
export function mergeablePairs(
  bookings: readonly Booking[],
  now: number = Date.now(),
): MergePair[] {
  const partials = bookings.filter((booking) => isPartial(booking, now));

  const candidates: MergePair[] = [];

  for (let i = 0; i < partials.length; i++) {
    for (let j = i + 1; j < partials.length; j++) {
      const a = partials[i];
      const b = partials[j];

      // Stesso identico inizio: è l'unico caso in cui i due gruppi stanno
      // davvero nello stesso campo senza spostare nessuno.
      if (a.bookingDate !== b.bookingDate) continue;

      // Già sullo stesso campo: non c'è niente da liberare.
      if (a.slot === b.slot) continue;

      const players = a.players.length + b.players.length;
      if (players > MAX_PLAYERS) continue;

      // Il campo resta a chi l'aveva preso per primo.
      const [keep, move] = a.createdAt <= b.createdAt ? [a, b] : [b, a];

      candidates.push({ keep, move, suggested: a.level === b.level, players });
    }
  }

  candidates.sort((a, b) => {
    // Stesso livello prima: è il criterio che il club usa per far giocare
    // insieme persone che si divertono.
    if (a.suggested !== b.suggested) return a.suggested ? -1 : 1;
    // Poi le coppie che chiudono il campo a quattro.
    if (a.players !== b.players) return b.players - a.players;
    return a.keep.bookingDate - b.keep.bookingDate;
  });

  const used = new Set<Id<"bookings">>();

  return candidates.filter((pair) => {
    if (used.has(pair.keep._id) || used.has(pair.move._id)) return false;
    used.add(pair.keep._id);
    used.add(pair.move._id);
    return true;
  });
}

/** L'altra metà di un campo condiviso, per le schede già unite. */
export function mergedPartnerOf(
  booking: Booking,
  bookings: readonly Booking[],
): Booking | undefined {
  if (!booking.mergedWith) return undefined;
  return bookings.find((other) => other._id === booking.mergedWith);
}
