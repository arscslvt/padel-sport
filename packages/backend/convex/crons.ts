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
 * Il battito dei contenuti social.
 *
 * Orario e non giornaliero perché i cron girano in UTC: qualunque appuntamento
 * fissato qui slitterebbe di un'ora fra estate e inverno. È `tick` a chiedere
 * l'ora al club e a decidere cosa è dovuto — e nel frattempo rimette in riga
 * ciò che si è incagliato.
 */
crons.interval(
  "contenuti social",
  { hours: 1 },
  internal.modules.social.tick.default,
  {},
);

export default crons;
