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

export default crons;
