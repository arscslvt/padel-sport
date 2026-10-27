import type { ComponentType } from "react";

import {
  BookingScene,
  ConfirmScene,
  EmptyDaysScene,
  NotifiedScene,
  ReminderScene,
} from "@/components/product/scenes";

/**
 * I momenti di una giornata al club, condivisi fra il racconto a scorrimento
 * del desktop e le storie del telefono: stesso testo, stessa scena.
 */
export interface Moment {
  time: string;
  title: string;
  body: string;
  Scene: ComponentType;
}

export const MOMENTS: readonly Moment[] = [
  {
    time: "09:00",
    title: "Sai subito dove servono partite",
    body: "Ogni mattina un avviso ti segnala i prossimi giorni ancora vuoti. Hai il tempo di riempirli.",
    Scene: EmptyDaysScene,
  },
  {
    time: "11:40",
    title: "Il giocatore prenota da solo",
    body: "Sceglie giorno, ora e compagni dal telefono. Se vuoi, paga subito online con SumUp.",
    Scene: BookingScene,
  },
  {
    time: "11:41",
    title: "Confermi con un tocco",
    body: "La richiesta arriva in agenda. Il campo lo sceglie Vetro, quello che non lascia buchi nella giornata.",
    Scene: ConfirmScene,
  },
  {
    time: "11:42",
    title: "Tutti i giocatori lo sanno",
    body: "Chi ha prenotato e i compagni ricevono la conferma, con il tasto per aggiungerla al calendario.",
    Scene: NotifiedScene,
  },
  {
    time: "19:20",
    title: "Dieci minuti prima, un promemoria",
    body: "Lo staff riceve un avviso con le partite in arrivo. Il tempo di accendere le luci e aprire il campo.",
    Scene: ReminderScene,
  },
];
