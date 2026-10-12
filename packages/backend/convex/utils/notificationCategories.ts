import { type Infer, v } from "convex/values";

/**
 * I tipi di avviso allo staff, fra cui ognuno sceglie cosa ricevere.
 *
 * Ogni chiamata a `notifications/alert` dichiara il suo tipo, e le notifiche
 * push arrivano solo a chi non l'ha spento (modules/push/preferences.ts).
 * Hark resta com'era: è il canale di chi vuole tutto.
 *
 * L'elenco vive qui e non nella dashboard perché etichette e chiavi sono la
 * stessa cosa vista da due lati: il gestionale le mostra, il backend le usa
 * per filtrare. Un tipo nuovo si aggiunge in fondo, e arriva acceso a tutti —
 * le preferenze salvano quel che è spento, non quel che è acceso.
 */
export const NOTIFICATION_CATEGORIES = [
  {
    key: "bookings",
    label: "Nuove prenotazioni",
    description: "Dal sito e dall'app, da confermare.",
  },
  {
    key: "cancellations",
    label: "Disdette",
    description: "Partite annullate dai clienti, campi uniti che tornano incompleti.",
  },
  {
    key: "matches",
    label: "Partite e giocatori",
    description: "Chi entra in una partita o chiede di farlo, partite aperte a tutti, nuove cerchie.",
  },
  {
    key: "requests",
    label: "Richieste",
    description: "Assistenza, ricerca di giocatori e segnalazioni sui punti.",
  },
  {
    key: "events",
    label: "Eventi",
    description: "Iscrizioni e rinunce agli eventi.",
  },
  {
    key: "deliveries",
    label: "Avvisi non recapitati",
    description: "Quando una conferma o una disdetta non arriva al cliente per email o WhatsApp.",
  },
  {
    key: "system",
    label: "Sistema",
    description: "Problemi di sincronizzazione con il calendario di SumUp.",
  },
] as const;

export const notificationCategory = v.union(
  v.literal("bookings"),
  v.literal("cancellations"),
  v.literal("matches"),
  v.literal("requests"),
  v.literal("events"),
  v.literal("deliveries"),
  v.literal("system"),
);

export type NotificationCategory = Infer<typeof notificationCategory>;
