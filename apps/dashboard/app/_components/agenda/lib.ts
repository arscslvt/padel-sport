import type { Doc } from "@padel-sport/backend/convex/_generated/dataModel";
import { format } from "date-fns";
import { it } from "date-fns/locale";

import type { StatusTone } from "@/app/_components/status-badge";
import { CLUB_TIME_ZONE, MATCH_DURATION_MS, MAX_PLAYERS } from "@/lib/booking";

/**
 * Date e orari dell'agenda, sempre nell'ora del club.
 *
 * Il telefono dello staff è quasi sempre a Melilli, ma «quasi» non basta: chi
 * guarda l'agenda da fuori deve vedere le partite all'ora in cui si giocano.
 * Il giorno si identifica con una chiave «AAAA-MM-GG» del fuso del club, che
 * si confronta e si ordina come una stringa.
 */

/**
 * Un avviso al cliente (email o WhatsApp) e com'è andato. L'id del provider
 * resta sul server: serve ai webhook, non a chi guarda.
 */
export type Delivery = Omit<Doc<"bookingDeliveries">, "providerId">;

/**
 * Una prenotazione dell'agenda. `deliveries` c'è quando arriva dalla route
 * dell'agenda (api/dashboard/bookings); altrove, per esempio nell'unione dei
 * campi, la prenotazione è quella nuda.
 */
export type Booking = Doc<"bookings"> & { deliveries?: Delivery[] };

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: CLUB_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormat = new Intl.DateTimeFormat("it-IT", {
  timeZone: CLUB_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
});

const DAY_MS = 24 * 60 * 60 * 1000;

export function dayKey(timestamp: number): string {
  return dayKeyFormat.format(timestamp);
}

/** Mezzogiorno del giorno indicato: il punto più lontano dai cambi d'ora. */
function noonOf(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function clubTime(timestamp: number): string {
  return timeFormat.format(timestamp);
}

export function timeRange(timestamp: number): string {
  return `${clubTime(timestamp)}–${clubTime(timestamp + MATCH_DURATION_MS)}`;
}

/** «Oggi», «Domani», altrimenti «Sabato 12 ottobre». */
export function dayLabel(key: string, today = dayKey(Date.now())): string {
  if (key === today) return "Oggi";
  if (key === dayKey(noonOf(today).getTime() + DAY_MS)) return "Domani";
  const label = format(noonOf(key), "EEEE d MMMM", { locale: it });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** «Sab 12 ott», per le righe dove lo spazio è poco. */
export function shortDayLabel(key: string, today = dayKey(Date.now())): string {
  if (key === today) return "Oggi";
  if (key === dayKey(noonOf(today).getTime() + DAY_MS)) return "Domani";
  return format(noonOf(key), "EEE d MMM", { locale: it });
}

export function weekdayInitial(key: string): string {
  return format(noonOf(key), "EEEEEE", { locale: it });
}

export function dayOfMonth(key: string): string {
  return format(noonOf(key), "d");
}

/**
 * I giorni della striscia: da oggi per almeno due settimane, e oltre se in
 * agenda c'è qualcosa più avanti. Fino a due mesi: più in là non si prenota.
 */
export function stripDays(bookings: readonly Booking[], now = Date.now()) {
  const last = bookings.reduce(
    (max, booking) => Math.max(max, booking.bookingDate),
    now,
  );
  const span = Math.min(60, Math.max(14, Math.ceil((last - now) / DAY_MS) + 1));

  const keys: string[] = [];
  const start = noonOf(dayKey(now)).getTime();
  for (let index = 0; index < span; index++) {
    const key = dayKey(start + index * DAY_MS);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

/** I prossimi `count` giorni da oggi, per scegliere quando prenotare. */
export function nextDays(count: number, now = Date.now()): string[] {
  const keys: string[] = [];
  const start = noonOf(dayKey(now)).getTime();
  for (let index = 0; keys.length < count && index < count + 2; index++) {
    const key = dayKey(start + index * DAY_MS);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys;
}

/** Il livello della prenotazione a partire da quello del cliente (1–5). */
export function levelFromRating(rating?: number): Booking["level"] {
  if (rating === undefined) return "intermedio";
  if (rating < 2.5) return "principiante";
  if (rating < 3.5) return "intermedio";
  return "avanzato";
}

export function isPending(booking: Booking): boolean {
  return booking.status === "pending_on_site_payment";
}

export function isCancelled(booking: Booking): boolean {
  return booking.status === "cancelled";
}

/** Prenotato per meno di quattro e non ancora unito a un altro gruppo. */
export function isPartial(booking: Booking): boolean {
  return (
    !booking.bookForAll &&
    !booking.mergedWith &&
    booking.players.length < MAX_PLAYERS
  );
}

export const LEVEL_LABELS: Record<Booking["level"], string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzato: "Avanzato",
};

export function totalPrice(booking: Booking): number {
  return booking.pricePerPlayer * booking.players.length;
}

/**
 * Il numero per WhatsApp: solo cifre, con il prefisso italiano quando manca.
 * Chi prenota dal sito scrive spesso «333 1234567», che `wa.me` non
 * riconoscerebbe come numero italiano.
 */
export function whatsappNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 && digits.startsWith("3")
    ? `39${digits}`
    : digits;
}

export function matchesSearch(booking: Booking, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [booking.bookedBy, booking.phone, booking.code, ...booking.players]
    .filter(Boolean)
    .some((value) => String(value).toLowerCase().includes(needle));
}

/* -------------------------------------------------------------------------- */
/*                              Avvisi al cliente                             */
/* -------------------------------------------------------------------------- */

export const DELIVERY_KIND_LABELS: Record<Delivery["kind"], string> = {
  accepted: "Conferma",
  merged: "Campo unito",
  cancelled_by_club: "Disdetta",
  cancelled_by_player: "Disdetta",
};

/**
 * Lo stato di un avviso detto allo sportello. L'email accettata da Resend è
 * già «inviata»: da lì in poi lo dicono i webhook. Il WhatsApp «in coda» è
 * un'attesa vera di Twilio, di pochi secondi.
 */
export function deliveryBadge(delivery: Delivery): {
  label: string;
  tone: StatusTone;
} {
  const email = delivery.channel === "email";
  switch (delivery.status) {
    case "skipped":
      return { label: email ? "Non inviata" : "Non inviato", tone: "neutral" };
    case "queued":
      return email
        ? { label: "Inviata", tone: "info" }
        : { label: "In coda", tone: "neutral" };
    case "sent":
      return { label: email ? "Inviata" : "Inviato", tone: "info" };
    case "delayed":
      return { label: "In ritardo", tone: "warning" };
    case "delivered":
      return { label: email ? "Consegnata" : "Consegnato", tone: "success" };
    case "read":
      return { label: "Letto", tone: "success" };
    case "complained":
      return { label: "Segnata come spam", tone: "warning" };
    case "failed":
      return {
        label: email ? "Non recapitata" : "Non recapitato",
        tone: "danger",
      };
  }
}

/**
 * Il cliente lo sa? Si guarda l'ultimo avviso mandato a chi ha prenotato —
 * la conferma, o la disdetta se è venuta dopo — su tutti i canali insieme:
 * basta che uno sia arrivato.
 *
 * `null` quando non c'è niente da dire: prenotazioni da confermare, o
 * confermate prima che esistesse il registro.
 */
export function clientReach(
  booking: Booking,
): "reached" | "pending" | "unreached" | null {
  const booker = (booking.deliveries ?? []).filter(
    (delivery) => delivery.role === "booker",
  );
  if (booker.length === 0) return null;

  const latest = booker.reduce((a, b) => (b.createdAt > a.createdAt ? b : a));
  const batch = booker.filter((delivery) => delivery.kind === latest.kind);

  const has = (...statuses: Delivery["status"][]) =>
    batch.some((delivery) => statuses.includes(delivery.status));

  if (has("delivered", "read", "complained")) return "reached";
  if (has("queued", "sent", "delayed")) return "pending";
  return "unreached";
}
