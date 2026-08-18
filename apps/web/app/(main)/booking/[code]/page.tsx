import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCalendar } from "@/components/add-to-calendar";
import { Button } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { formatClubDay, formatClubSlotRange, MAX_PLAYERS } from "@/lib/booking";
import { bookingCalendarEvent } from "@/lib/booking-calendar";
import { bookingIcsPath } from "@/lib/booking-links";
import { getInfo } from "@/lib/info";

/**
 * Pagina a cui punta il QR della prenotazione.
 *
 * La legge chi ha il codice: chi prenota, i compagni che hanno ricevuto la
 * mail e la struttura all'ingresso. Per questo mostra il minimo indispensabile
 * a riconoscere la partita — data, campo, squadra — e niente recapiti.
 */

const LEVEL_LABELS = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzato: "Avanzato",
} as const;

async function loadBooking(code: string) {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) return null;

  const convex = new ConvexHttpClient(convexUrl);
  return await convex.query(api.bookings.getByCode.default, { code });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;

  return {
    title: `Prenotazione ${code.toUpperCase()} | A.S.D. Padel Sport Melilli`,
    // Un codice di prenotazione non ha ragione di finire nei motori di ricerca.
    robots: { index: false, follow: false },
  };
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const booking = await loadBooking(code);

  if (!booking) notFound();

  const cancelled = booking.status === "cancelled";
  const confirmed = booking.status === "accepted_on_site_payment";
  const missing = Math.max(0, MAX_PLAYERS - booking.players.length);

  return (
    <section className="mx-auto w-full max-w-2xl px-6 pb-24 lg:px-12">
      <header className="mb-10">
        <p className="text-muted-foreground text-xs tracking-wide uppercase">
          {cancelled
            ? "Prenotazione annullata"
            : confirmed
              ? "Prenotazione confermata"
              : "Prenotazione registrata"}
        </p>
        <Heading as="h1" size="page" className="mt-2">
          {formatClubDay(booking.bookingDate)}
        </Heading>
        <p className="text-muted-foreground pt-3 text-sm">
          {formatClubSlotRange(booking.bookingDate)}
          {booking.court ? ` · ${booking.court}` : ""}
        </p>
      </header>

      <div className="rounded-card bg-muted flex flex-col items-center gap-6 p-6 sm:p-8">
        {cancelled ? (
          <p className="text-muted-foreground max-w-[42ch] text-center text-sm leading-relaxed">
            Questa prenotazione è stata annullata. Se pensi si tratti di un
            errore, chiamaci: il campo potrebbe essere ancora libero.
          </p>
        ) : confirmed ? (
          <Image
            src={`/api/bookings/${booking.code}/qr`}
            alt={`QR della prenotazione ${booking.code}`}
            width={220}
            height={220}
            unoptimized
            className="bg-background size-44 rounded-2xl p-3 sm:size-52"
          />
        ) : (
          <p className="text-muted-foreground max-w-[42ch] text-center text-sm leading-relaxed">
            La struttura sta esaminando la richiesta. Appena è confermata ti
            arriva il codice d'ingresso via email: è quello che ti fa entrare in
            campo.
          </p>
        )}

        <div className="text-center">
          <p className="text-muted-foreground text-xs tracking-wide uppercase">
            Codice
          </p>
          <p className="font-mono text-2xl tracking-[0.2em]">{booking.code}</p>
        </div>

        {!cancelled && booking.code && (
          <AddToCalendar
            event={bookingCalendarEvent({
              code: booking.code,
              bookingDate: booking.bookingDate,
              court: booking.court,
            })}
            icsHref={bookingIcsPath(booking.code)}
          />
        )}
      </div>

      <dl className="border-border mt-8 border-t">
        <div className="border-border flex justify-between gap-6 border-b py-3.5">
          <dt className="text-muted-foreground text-sm">Livello</dt>
          <dd className="text-sm">{LEVEL_LABELS[booking.level]}</dd>
        </div>
        <div className="border-border flex justify-between gap-6 border-b py-3.5">
          <dt className="text-muted-foreground text-sm">
            In campo ({booking.players.length}/{MAX_PLAYERS})
          </dt>
          <dd className="text-right text-sm">
            {booking.players.join(", ") || "Da definire"}
          </dd>
        </div>
      </dl>

      {!cancelled && missing > 0 && (
        <p className="text-muted-foreground border-border mt-6 rounded-xl border border-dashed px-4 py-3 text-sm leading-relaxed">
          {missing === 1
            ? "Manca un giocatore"
            : `Mancano ${missing} giocatori`}
          : li cerchiamo noi fra chi gioca allo stesso livello.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-2.5 sm:flex-row">
        <Button asChild size="pill-lg">
          <a href={`tel:${getInfo("cell")?.replace(/\s/g, "")}`}>
            Chiama la struttura
          </a>
        </Button>
        <Button asChild variant="outline" size="pill-lg">
          <Link href="/">Torna al sito</Link>
        </Button>
      </div>
    </section>
  );
}
