import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Il meteo al club, un giorno per riga.
 *
 * Lo legge l'agenda della dashboard, per capire se un giorno rischia la
 * pioggia. Le previsioni arrivano da Open-Meteo due volte al giorno
 * (modules/weather/refresh.ts) e ogni lettura *riscrive* la riga del suo
 * giorno invece di aggiungerne una: la tabella resta di un giorno per riga, e
 * un giorno passato tiene l'ultima previsione ricevuta, che a quel punto è
 * quasi una cronaca. Così in agenda si può guardare anche com'era il tempo.
 *
 * Nessun dato personale: le righe restano finché servono.
 *
 * Le ore sono quelle del club, come le dà Open-Meteo con il fuso
 * `Europe/Rome`: niente timestamp, che al cambio dell'ora sposterebbero il
 * pomeriggio di un'ora.
 */
const weatherDays = defineTable({
  /** "AAAA-MM-GG" nell'ora del club. */
  day: v.string(),
  /** Codice WMO della giornata (0 sereno … 99 temporale con grandine). */
  code: v.float64(),
  tempMax: v.float64(),
  tempMin: v.float64(),
  /** Millimetri di pioggia previsti (o caduti) in tutta la giornata. */
  precipitation: v.float64(),
  /** La probabilità più alta della giornata, in %. Sui giorni passati manca. */
  precipitationProbability: v.optional(v.float64()),
  /** Raffica più forte, in km/h. */
  gustsMax: v.optional(v.float64()),
  /** "07:12", ora del club. */
  sunrise: v.optional(v.string()),
  sunset: v.optional(v.string()),
  /** Ora per ora: è da qui che si legge «piove alle cinque?». */
  hours: v.array(
    v.object({
      /** 0–23, ora del club. */
      hour: v.float64(),
      code: v.float64(),
      temp: v.float64(),
      precipitation: v.float64(),
      precipitationProbability: v.optional(v.float64()),
      wind: v.float64(),
      gusts: v.float64(),
      isDay: v.boolean(),
    }),
  ),
  /** Quando è arrivata questa versione della previsione. */
  fetchedAt: v.float64(),
}).index("by_day", ["day"]);

export default weatherDays;
