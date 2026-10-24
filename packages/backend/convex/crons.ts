import { cronJobs } from "convex/server";

import { internal } from "./_generated/api";

/**
 * SumUp Bookings non ha API pubbliche: l'unico modo per sapere che qualcuno ha
 * prenotato di là è rileggere il calendario che ci sincronizza. Cinque minuti
 * sono il compromesso fra quanto vogliamo essere allineati e quanto vale la
 * pena chiamare Google per due campi.
 */
const crons = cronJobs();

crons.interval(
  "calendario campi",
  { minutes: 5 },
  internal.modules.courtCalendar.pull.default,
  {},
);

/**
 * I punti in attesa più vecchi di un anno: è il termine scritto nel
 * regolamento e nell'informativa (modules/points/expire.ts).
 */
crons.interval(
  "punti in attesa scaduti",
  { hours: 24 },
  internal.modules.points.expire.default,
  {},
);

/**
 * I tempi di conservazione promessi dall'informativa privacy: richieste,
 * iscrizioni agli eventi e il loro storico (modules/privacy/retention.ts).
 */
crons.interval(
  "dati personali scaduti",
  { hours: 24 },
  internal.modules.privacy.retention.default,
  {},
);

/**
 * I promemoria allo staff sui telefoni con le notifiche attive
 * (modules/reminders): ogni minuto le partite che cominciano fra dieci, ogni
 * ora — ma parte solo alle 9 e alle 14 del club — i prossimi giorni ancora
 * senza partite.
 */
/**
 * L'eliminazione degli account (modules/clients/deletion.ts): ogni ora le
 * cancellazioni controllate arrivate ai trenta giorni, ogni giorno le copie
 * congelate da più di un anno.
 */
crons.interval(
  "account da eliminare",
  { hours: 1 },
  internal.modules.clients.deletion.runDue,
  {},
);

crons.interval(
  "account eliminati da rimuovere",
  { hours: 24 },
  internal.modules.clients.deletion.purgeDue,
  {},
);

crons.interval(
  "promemoria partite in partenza",
  { minutes: 1 },
  internal.modules.reminders.starting.default,
  {},
);

crons.hourly(
  "promemoria giorni senza partite",
  { minuteUTC: 0 },
  internal.modules.reminders.emptyDays.default,
  {},
);

export default crons;
