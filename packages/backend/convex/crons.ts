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

export default crons;
