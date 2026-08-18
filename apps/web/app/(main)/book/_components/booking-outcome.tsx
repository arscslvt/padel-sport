"use client";

import { api } from "@padel-sport/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import Link from "next/link";

import { AddToCalendar } from "@/components/add-to-calendar";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { formatClubDay, formatClubSlotRange, MAX_PLAYERS } from "@/lib/booking";
import { bookingCalendarEvent } from "@/lib/booking-calendar";
import { bookingIcsPath } from "@/lib/booking-links";
import { MY_BOOKINGS_LINK } from "@/lib/links";

/**
 * Esito della richiesta: quando si gioca, il riferimento e — quando la squadra
 * è incompleta — la presa in carico del club.
 *
 * Niente QR: la prenotazione non è ancora confermata, e il codice d'ingresso
 * arriva via mail solo quando la struttura accetta. Mostrarlo qui vorrebbe
 * dire insegnare a presentarsi in campo senza aspettare il via libera.
 *
 * Il campo assegnato non lo sa il client: lo sceglie il backend, quindi lo
 * rileggiamo dalla prenotazione appena creata.
 */
export function BookingOutcome({
  code,
  squadSize,
}: {
  code: string;
  squadSize: number;
}) {
  const booking = useQuery(api.bookings.getByCode.default, { code });
  const missing = MAX_PLAYERS - squadSize;

  return (
    <div className="text-center">
      <p className="text-muted-foreground text-xs tracking-wide uppercase">
        Richiesta inviata
      </p>
      <Heading as="h2" size="section" className="mt-2">
        Ci stiamo lavorando
      </Heading>

      {booking && (
        <p className="text-muted-foreground mt-3 text-sm">
          {formatClubDay(booking.bookingDate)},{" "}
          {formatClubSlotRange(booking.bookingDate)}
          {booking.court ? ` · ${booking.court}` : ""}
        </p>
      )}

      <div className="bg-background border-border mx-auto mt-8 w-full max-w-xs rounded-2xl border p-6">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          Riferimento
        </p>
        <p className="font-mono text-2xl tracking-[0.2em]">{code}</p>
      </div>

      <p className="text-muted-foreground mx-auto mt-6 max-w-[52ch] text-sm leading-relaxed">
        La struttura sta esaminando la richiesta. Appena è confermata ti
        mandiamo per email il codice d'ingresso, da mostrare in campo: fino ad
        allora la prenotazione non è definitiva.
      </p>

      {booking && (
        <div className="mt-5 flex justify-center">
          <AddToCalendar
            event={bookingCalendarEvent({
              code,
              bookingDate: booking.bookingDate,
              court: booking.court,
            })}
            icsHref={bookingIcsPath(code)}
          />
        </div>
      )}

      {missing > 0 && (
        <p className="text-muted-foreground mx-auto mt-4 max-w-[52ch] text-sm leading-relaxed">
          {missing === 1
            ? "Manca un giocatore"
            : `Mancano ${missing} giocatori`}
          : ci pensiamo noi. Cerchiamo chi gioca al vostro livello e ti
          contattiamo se serve definire qualche dettaglio.
        </p>
      )}

      <div className="mx-auto mt-8 flex max-w-sm flex-col gap-2.5">
        <Button asChild size="pill-lg">
          <Link href={`/booking/${code}`}>Vedi la prenotazione</Link>
        </Button>
        <Button asChild variant="outline" size="pill-lg">
          <Link href="/">Torna alla home</Link>
        </Button>
      </div>

      <p className="text-muted-foreground mx-auto mt-6 max-w-[52ch] text-xs leading-relaxed">
        Se la mail non arriva, il codice non è perso: lo ritrovi in{" "}
        <Link
          href={MY_BOOKINGS_LINK}
          className="hover:text-foreground underline underline-offset-4"
        >
          Le tue prenotazioni
        </Link>
        , verificando lo stesso indirizzo email.
      </p>
    </div>
  );
}
