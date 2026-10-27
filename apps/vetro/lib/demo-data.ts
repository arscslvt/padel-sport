/**
 * I dati d'esempio dei componenti di prodotto.
 *
 * Un club inventato, con nomi credibili: servono a mostrare come si legge
 * una giornata vera, non a raccontare numeri. Nessuno di questi è un
 * cliente reale.
 */

export const DEMO_CLUB = "Padel Club Riviera";
export const DEMO_STAFF = "Marta";

export const DAYS = [
  { short: "Lun", day: 26, pending: false },
  { short: "Mar", day: 27, pending: false },
  { short: "Mer", day: 28, pending: true },
  { short: "Gio", day: 29, pending: false },
  { short: "Ven", day: 30, pending: false },
  { short: "Sab", day: 31, pending: true },
  { short: "Dom", day: 1, pending: false },
] as const;

export const TODAY_INDEX = 5;

export type DemoBooking = {
  id: string;
  start: string;
  end: string;
  players: string;
  court: string;
  seats: string;
  level: string;
  /** A destra della riga: lo stato, o quanto resta da incassare. */
  aside:
    | { kind: "price"; label: string }
    | { kind: "badge"; tone: "success" | "warning"; label: string };
  notice?: { tone: "success" | "warning" | "info"; label: string };
};

export const BOOKINGS: DemoBooking[] = [
  {
    id: "amato",
    start: "19:30",
    end: "21:00",
    players: "Chiara Amato, Paolo Greco e altri 2",
    court: "Campo 1",
    seats: "4/4",
    level: "Avanzato",
    aside: { kind: "badge", tone: "success", label: "Pagata online" },
  },
  {
    id: "spadaro",
    start: "21:00",
    end: "22:30",
    players: "Luca Spadaro, Andrea Messina e 1 altro",
    court: "Campo 3",
    seats: "3/4",
    level: "Principiante",
    aside: { kind: "price", label: "40,00 €" },
    notice: { tone: "warning", label: "Da completare · manca 1" },
  },
  {
    id: "caruso",
    start: "21:00",
    end: "22:30",
    players: "Federica Caruso, Elena Fichera e altri 2",
    court: "Campo 1",
    seats: "4/4",
    level: "Intermedio",
    aside: { kind: "price", label: "40,00 €" },
  },
];

/** La prenotazione che arriva durante l'animazione dell'hero. */
export const INCOMING = {
  id: "ferraro",
  start: "19:30",
  end: "21:00",
  players: "Giulia Ferraro, Sara Privitera e altri 2",
  owner: "Giulia Ferraro",
  court: "Campo 2",
  seats: "4/4",
  level: "Intermedio",
} as const;

export const LIVE_MATCH = {
  start: "18:00",
  end: "19:30",
  players: "Marco Russo, Davide Lo Presti e altri 2",
  court: "Campo 1",
} as const;
