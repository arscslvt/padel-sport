import type { Doc, Id } from "@padel-sport/backend/convex/_generated/dataModel";
import {
  emailRetryTargets,
  hasEmailRetry,
  onlyTarget,
  type RetryTarget,
} from "@padel-sport/backend/convex/modules/deliveries/retry";
import type { PaymentReference } from "@padel-sport/backend/convex/modules/payments/lib";
import {
  bookingTotal,
  formatEuro,
  roundEuro,
} from "@padel-sport/backend/convex/modules/pricing/lib";
import {
  closureOn,
  isWeekdayClosed,
  type Schedule,
} from "@padel-sport/backend/convex/modules/settings/schedule";
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
 * Una prenotazione dell'agenda. `deliveries` e `payments` ci sono quando
 * arriva dalla route dell'agenda (api/dashboard/bookings); altrove, per
 * esempio nell'unione dei campi, la prenotazione è quella nuda.
 */
export type Booking = Doc<"bookings"> & {
  deliveries?: Delivery[];
  /** Gli incassi online, con i riferimenti per ritrovarli su SumUp. */
  payments?: PaymentReference[];
  /**
   * I giocatori collegati oltre a chi prenota, con i loro recapiti
   * (bookings/list.ts): anche quelli che nessun avviso ha ancora raggiunto.
   */
  linkedPlayers?: LinkedPlayer[];
  /** Il numero nella scheda di chi ha prenotato, se ha una scheda. */
  bookerCardPhone?: string;
  /**
   * Chi l'ha fatta: il cliente da sé (dal sito, dall'app, o non si sa più da
   * dove) oppure lo staff dal gestionale (bookings/list.ts).
   */
  origin?: "web" | "app" | "client" | "staff";
};

export interface LinkedPlayer {
  playerId: Id<"players">;
  name: string;
  /** Pronto per WhatsApp; assente se in scheda non c'è. */
  phone?: string;
  /** Ha un indirizzo, in scheda o sull'account. */
  hasEmail: boolean;
}

/** Presa dallo staff, dal gestionale, invece che dal cliente da sé. */
export function isStaffMade(booking: Booking): boolean {
  return booking.origin === "staff";
}

/**
 * Come si chiama una prenotazione: i giocatori, separati da virgola. Un campo
 * lo prende sempre un gruppo, e il gruppo è il nome. Chi mostra l'etichetta la
 * tronca con i puntini quando non ci sta.
 */
export function playersLabel(
  booking: Pick<Doc<"bookings">, "players" | "bookedBy">,
): string {
  return booking.players.join(", ") || booking.bookedBy;
}

/**
 * Un giocatore in campo, con la sua scheda cliente se ne ha una, o il recapito
 * lasciato allo staff se non ce l'ha.
 */
export interface RosterEntry {
  name: string;
  playerId?: Id<"players">;
  phone?: string;
}

/**
 * I giocatori della prenotazione, nell'ordine, ognuno con la sua scheda.
 *
 * Le schede sono quella di `createdByPlayer` (il nome è `bookedBy`) e quelle
 * dei collegati (bookings/list.ts): ognuna va al primo nome uguale ancora
 * libero, così due omonimi restano due. I recapiti di chi non ha scheda
 * (`guestContacts`) vanno ai nomi rimasti senza, con la stessa regola.
 */
export function rosterOf(booking: Booking): RosterEntry[] {
  const cards: RosterEntry[] = [
    ...(booking.createdByPlayer
      ? [{ name: booking.bookedBy, playerId: booking.createdByPlayer }]
      : []),
    ...(booking.linkedPlayers ?? []).map(({ name, playerId }) => ({
      name,
      playerId,
    })),
  ];

  const contacts = [...(booking.guestContacts ?? [])];

  return booking.players.map((name) => {
    const index = cards.findIndex((card) => card.name === name);
    if (index !== -1) {
      return { name, playerId: cards.splice(index, 1)[0].playerId };
    }
    const contact = contacts.findIndex((row) => row.name === name);
    if (contact === -1) return { name };
    return { name, phone: contacts.splice(contact, 1)[0].phone };
  });
}

/**
 * La riga in fondo alla scheda: chi ha creato la prenotazione, da dove e
 * quando. «Creata da Mario Rossi il 12 ottobre alle 9:41.» Quella del cliente
 * dice chi è stato: in cima la scheda mostra il gruppo, non chi ha prenotato.
 */
export function authorLine(booking: Booking): string {
  const when = format(booking.createdAt, "d MMMM 'alle' H:mm", { locale: it });
  const who = booking.bookedBy ? `da ${booking.bookedBy}` : "dal cliente";

  switch (booking.origin) {
    case "staff":
      return booking.createdByStaff
        ? `Creata da ${booking.createdByStaff.name} il ${when}.`
        : `Creata dal gestionale il ${when}.`;
    case "web":
      return `Prenotata ${who} sul sito il ${when}.`;
    case "app":
      return `Prenotata ${who} nell'app il ${when}.`;
    case "client":
      return `Prenotata ${who} il ${when}.`;
    default:
      return `Prenotata il ${when}.`;
  }
}

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

/**
 * Il club è chiuso quel giorno? Per lo staff, in agenda: il titolo e il
 * perché. Nulla se è aperto, o se la configurazione non è ancora arrivata.
 */
export function closedDay(
  schedule: Schedule | undefined,
  key: string,
): { title: string; detail: string } | null {
  if (!schedule) return null;

  const closure = closureOn(schedule, key);
  if (closure) {
    return { title: "Club chiuso", detail: closure.reason ?? "Chiusura" };
  }
  if (isWeekdayClosed(schedule, noonOf(key).getDay())) {
    return {
      title: "Club chiuso",
      detail: "Giorno spento in Configurazione",
    };
  }
  return null;
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

/**
 * I campi che occupa: il suo, e gli altri quando un gruppo più grande ne
 * prende più d'uno alla stessa ora (bookings/staffCreate.ts).
 */
export function courtsOf(
  booking: Pick<Doc<"bookings">, "slot" | "extraSlots">,
): Id<"slots">[] {
  return [booking.slot, ...(booking.extraSlots ?? [])];
}

/** Otto persone su due campi con una prenotazione sola (bookings/staffCreate.ts). */
export function isQuadrangolare(
  booking: Pick<Doc<"bookings">, "slot" | "extraSlots">,
): boolean {
  return courtsOf(booking).length > 1;
}

/** I posti in campo: quattro per ogni campo occupato. */
export function seatsOf(
  booking: Pick<Doc<"bookings">, "slot" | "extraSlots">,
): number {
  return MAX_PLAYERS * courtsOf(booking).length;
}

/** I campi come li legge una persona: «Campo 1», o «Campo 1 e Campo 2». */
export function courtLabel(
  booking: Pick<Doc<"bookings">, "slot" | "extraSlots">,
  courtNames: ReadonlyMap<string, string>,
): string | undefined {
  const names = courtsOf(booking)
    .map((id) => courtNames.get(id))
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b, "it", { numeric: true }));
  if (names.length <= 1) return names[0];
  return `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`;
}

/** Prenotato per meno dei posti che ha e non ancora unito a un altro gruppo. */
export function isPartial(booking: Booking): boolean {
  return (
    !booking.bookForAll &&
    !booking.mergedWith &&
    booking.players.length < seatsOf(booking)
  );
}

/**
 * Come si chiama una prenotazione con meno di quattro giocatori. Quella del
 * cliente «cerca giocatori»: è lui ad averla aperta perché qualcuno si unisca.
 * Quella presa dallo staff è «da completare»: di solito la squadra c'è già, e
 * i nomi mancanti si aggiungono allo sportello.
 */
export function partialLabel(booking: Booking): string {
  return isStaffMade(booking) ? "Da completare" : "Cerca giocatori";
}

/** Le tacche accese di `LevelBars` (components/level-bars.tsx) per ogni fascia. */
export const LEVEL_BARS: Record<Booking["level"], number> = {
  principiante: 1,
  intermedio: 2,
  avanzato: 3,
};

export const LEVEL_LABELS: Record<Booking["level"], string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzato: "Avanzato",
};

/** Pagata online dal cliente (modules/payments). */
export function isPaidOnline(booking: Booking): boolean {
  return booking.paymentMode === "online";
}

/**
 * Quanto resta da incassare allo sportello: la squadra di adesso, meno quel
 * che il cliente ha già pagato online. Chi si è aggiunto dopo il pagamento
 * paga la sua quota qui.
 */
export function dueOnSite(booking: Booking): number {
  const paid = isPaidOnline(booking) ? (booking.paidAmount ?? 0) : 0;
  return roundEuro(Math.max(0, bookingTotal(booking) - paid));
}

/** "28 €": quanto incassare in struttura. */
export function onSiteTotal(booking: Booking): string {
  return formatEuro(dueOnSite(booking));
}

/** Annullata dopo essere stata pagata online: i soldi vanno restituiti. */
export function needsRefund(booking: Booking): boolean {
  return booking.status === "cancelled" && isPaidOnline(booking);
}

/** Ha avuto un incasso online poi restituito dallo staff. */
export function wasRefunded(booking: Booking): boolean {
  return (
    booking.payments?.some((payment) => payment.status === "refunded") ?? false
  );
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
  rescheduled: "Cambio d'orario",
  invited: "Invito alla partita",
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

/* ------------------------------ Per persona ------------------------------ */

/**
 * Chi è stato avvisato, con tutti i suoi avvisi: la scheda li mostra persona
 * per persona, non tentativo per tentativo. Con più giocatori in campo la
 * domanda dello staff è «lui l'ha saputo?», e la risposta sta in una riga.
 */
export interface Recipient {
  /** `booker`, `player:<id>` o `guest:<email>`: stabile fra un caricamento e l'altro. */
  key: string;
  role: Delivery["role"];
  name: string;
  playerId?: Id<"players">;
  /** L'ospite non ha una scheda: lo riconosce l'indirizzo. */
  email?: string;
  /** Il numero in scheda, per i giocatori collegati: il WhatsApp parte da lì. */
  phone?: string;
  /** Collegato alla prenotazione: la conferma gli spetta anche senza avvisi. */
  linked?: boolean;
  /** Dal più recente. */
  deliveries: Delivery[];
}

// Chi ha prenotato è un giocatore come gli altri: la scheda non lo distingue.
export const ROLE_LABELS: Record<Delivery["role"], string> = {
  booker: "Giocatore",
  player: "Giocatore",
  guest: "Ospite",
};

function recipientKey(delivery: Delivery): string | null {
  if (delivery.role === "booker") return "booker";
  if (delivery.role === "player") {
    return delivery.playerId ? `player:${delivery.playerId}` : null;
  }
  return delivery.recipient
    ? `guest:${delivery.recipient.toLowerCase()}`
    : null;
}

/**
 * Le persone avvisate: prima chi ha prenotato, poi i giocatori, poi gli
 * ospiti, ognuno nell'ordine in cui è stato avvisato la prima volta. Chi ha
 * prenotato c'è anche senza avvisi quando gli si può ancora mandare la
 * conferma: è da qui che la si manda.
 */
export function deliveryRecipients(
  booking: Booking,
  now = Date.now(),
): Recipient[] {
  const byKey = new Map<string, Recipient>();
  const oldestFirst = [...(booking.deliveries ?? [])].sort(
    (a, b) => a.createdAt - b.createdAt,
  );

  for (const delivery of oldestFirst) {
    const key = recipientKey(delivery);
    if (!key) continue;

    let person = byKey.get(key);
    if (!person) {
      person = {
        key,
        role: delivery.role,
        name:
          delivery.role === "booker"
            ? booking.bookedBy
            : (delivery.name ?? delivery.recipient ?? "Giocatore"),
        playerId: delivery.playerId,
        email:
          delivery.role === "guest"
            ? delivery.recipient?.toLowerCase()
            : undefined,
        deliveries: [],
      };
      byKey.set(key, person);
    }
    // Il nome più recente vince: le righe vecchie potevano non averlo.
    if (delivery.role !== "booker" && delivery.name)
      person.name = delivery.name;
    person.deliveries.unshift(delivery);
  }

  // I collegati ci sono anche senza avvisi: sulle prenotazioni confermate
  // prima che la conferma andasse a tutti non ne hanno, e vanno avvisati.
  if (booking.status === "accepted_on_site_payment") {
    for (const player of booking.linkedPlayers ?? []) {
      const key = `player:${player.playerId}`;
      const known = byKey.get(key);
      if (known) {
        known.phone = player.phone;
        known.linked = true;
        continue;
      }
      byKey.set(key, {
        key,
        role: "player",
        name: player.name,
        playerId: player.playerId,
        phone: player.phone,
        linked: true,
        deliveries: [],
      });
    }
  }

  if (!byKey.has("booker")) {
    const booker: Recipient = {
      key: "booker",
      role: "booker",
      name: booking.bookedBy,
      playerId: booking.createdByPlayer,
      deliveries: [],
    };
    if (whatsappRetry(booking, booker, now)) byKey.set("booker", booker);
  }

  const order = { booker: 0, player: 1, guest: 2 } as const;
  return [...byKey.values()].sort((a, b) => order[a.role] - order[b.role]);
}

/**
 * Chi è in campo ma non riceve niente: un nome scritto a mano, senza scheda
 * cliente e senza mail da ospite. Si trova per differenza fra i nomi della
 * prenotazione e le persone avvisate: un nome per ogni persona, così due
 * omonimi restano due. Chi ha prenotato è sempre fra gli avvisati.
 */
export function uncontactedNames(
  booking: Booking,
  people: Recipient[],
): string[] {
  const reached = people
    .filter((person) => person.role !== "booker")
    .map((person) => person.name);

  return booking.players.slice(1).filter((name) => {
    const index = reached.indexOf(name);
    if (index === -1) return true;
    reached.splice(index, 1);
    return false;
  });
}

/** L'ultimo avviso di una persona su un canale, di qualunque tipo. */
export function latestOn(
  person: Recipient,
  channel: Delivery["channel"],
): Delivery | undefined {
  return person.deliveries.find((delivery) => delivery.channel === channel);
}

/**
 * L'ha saputo? Basta un canale arrivato. Si guarda l'ultimo avviso di ogni
 * canale: è quello che dice com'è adesso.
 */
export function recipientReach(person: Recipient): {
  label: string;
  tone: StatusTone;
} {
  const latest = (["whatsapp", "email"] as const)
    .map((channel) => latestOn(person, channel))
    .filter((delivery) => delivery !== undefined);
  const has = (...statuses: Delivery["status"][]) =>
    latest.some((delivery) => statuses.includes(delivery.status));

  if (has("delivered", "read", "complained")) {
    return { label: "Raggiunto", tone: "success" };
  }
  if (has("queued", "sent", "delayed")) {
    return { label: "In consegna", tone: "info" };
  }
  if (has("failed")) return { label: "Non raggiunto", tone: "danger" };
  return {
    label: latest.length === 0 ? "Non ancora avvisato" : "Non avvisato",
    tone: "neutral",
  };
}

function isActive(booking: Booking, now: number): boolean {
  return (
    booking.status === "accepted_on_site_payment" &&
    booking.bookingDate + MATCH_DURATION_MS >= now
  );
}

/**
 * Si può (ri)mandare il WhatsApp di conferma a questa persona? Sì su una
 * prenotazione confermata e non ancora giocata, quando il suo ultimo
 * tentativo non è partito: fallito, saltato per mancanza del numero, escluso
 * alla conferma. Uno in viaggio no, sarebbe un doppione. Gli ospiti non hanno
 * un numero. È la stessa regola del server (bookings/whatsapp.ts).
 *
 * `last` è quel tentativo, per dire com'era andato; assente se non c'è mai
 * stato (solo per chi ha prenotato, sulle prenotazioni di prima del registro).
 */
export function whatsappRetry(
  booking: Booking,
  person: Recipient,
  now = Date.now(),
): { last?: Delivery } | null {
  if (!isActive(booking, now) || person.role === "guest") return null;

  const last = person.deliveries.find(
    (delivery) =>
      delivery.channel === "whatsapp" && delivery.kind === "accepted",
  );

  if (!last) {
    const owed =
      person.role === "booker"
        ? booking.notificationStatus !== "sent_with_whatsapp"
        : Boolean(person.linked);
    return owed ? {} : null;
  }
  return last.status === "failed" || last.status === "skipped"
    ? { last }
    : null;
}

/** Chi si sceglie per rimandargli la mail (bookings/email.ts). */
export function retryTarget(person: Recipient): RetryTarget | null {
  if (person.role === "booker") return { role: "booker" };
  if (person.role === "player" && person.playerId) {
    return { role: "player", playerId: person.playerId };
  }
  if (person.role === "guest" && person.email) {
    return { role: "guest", email: person.email };
  }
  return null;
}

/**
 * Si può rimandare la mail di conferma a questa persona? La regola è quella
 * del server (modules/deliveries/retry.ts), ristretta a lei.
 */
export function emailRetry(
  booking: Booking,
  person: Recipient,
  now = Date.now(),
): boolean {
  if (!isActive(booking, now)) return false;
  const target = retryTarget(person);
  if (!target) return false;
  return hasEmailRetry(
    onlyTarget(
      emailRetryTargets(booking, booking.deliveries ?? [], linkedOf(booking)),
      target,
    ),
  );
}

function linkedOf(booking: Booking) {
  return (booking.linkedPlayers ?? []).map(({ playerId, name }) => ({
    playerId,
    name,
  }));
}

/**
 * I giocatori collegati che la conferma non l'hanno mai avuta, su una
 * prenotazione confermata e non ancora iniziata: a loro si manda tutta
 * insieme, mail e WhatsApp (bookings/notifyPlayers.ts).
 */
export function missingConfirmations(
  booking: Booking,
  now = Date.now(),
): LinkedPlayer[] {
  if (booking.status !== "accepted_on_site_payment") return [];
  if (booking.bookingDate <= now) return [];

  const confirmed = new Set(
    (booking.deliveries ?? [])
      .filter((delivery) => delivery.kind === "accepted" && delivery.playerId)
      .map((delivery) => delivery.playerId),
  );
  return (booking.linkedPlayers ?? []).filter(
    (player) => !confirmed.has(player.playerId),
  );
}

/** La scheda cliente di questa persona, se ne ha una. */
export function recipientCard(
  booking: Booking,
  person: Recipient,
): Id<"players"> | undefined {
  return person.role === "booker" ? booking.createdByPlayer : person.playerId;
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
