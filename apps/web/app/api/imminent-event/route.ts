import { NextResponse } from "next/server";

import { isUpcoming } from "@/lib/events";
import type { ImminentEvent } from "@/lib/imminent-event";
import { client } from "@/sanity/client";
import { EVENTS_QUERY } from "@/sanity/queries";
import type { EventCardData } from "@/sanity/types";

/**
 * I prossimi eventi in programma, per la barra sotto la navigazione.
 *
 * La risposta è cacheabile perché non contiene il verdetto «è imminente?»:
 * quello lo calcola il client sull'ora locale (vedi `pickImminent`). Qui si
 * risponde soltanto a «qual è il prossimo evento», che cambia di rado.
 *
 * Esiste come endpoint e non come fetch nel layout perché la barra vive
 * dentro l'header, che sopravvive alle navigazioni: un layout condiviso non
 * viene ri-renderizzato cambiando rotta, quindi arrivando sulla home da una
 * pagina statica porterebbe dati congelati alla build.
 */
export const revalidate = 300;

/** Più di uno: se il primo scade dentro la finestra di cache, il client passa
 *  al successivo senza aspettare la revalidation. */
const CANDIDATES = 3;

export async function GET() {
  let events: ImminentEvent[] = [];

  try {
    const all = await client.fetch<EventCardData[]>(EVENTS_QUERY);

    events = all
      .filter((event) => isUpcoming(event))
      .sort(
        (a, b) =>
          new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime(),
      )
      .slice(0, CANDIDATES)
      .map((event) => ({
        _id: event._id,
        title: event.title,
        slug: event.slug,
        dateStart: event.dateStart,
        dateEnd: event.dateEnd ?? null,
        banner: event.banner ?? null,
      }));
  } catch (error) {
    // Se Sanity non risponde la barra semplicemente non appare: è un richiamo
    // accessorio, non deve far rumore.
    console.error("Lettura dei prossimi eventi fallita:", error);
  }

  return NextResponse.json({ events });
}
