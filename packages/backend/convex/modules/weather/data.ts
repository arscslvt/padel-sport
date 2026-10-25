import { v } from "convex/values";

import { internalMutation, query } from "../../_generated/server";
import weatherDays from "../../tables/weatherDays";
import { clubDayKey } from "../settings/lib";

/**
 * Le righe del meteo: la scrittura dopo ogni lettura da Open-Meteo, e la
 * query con cui l'agenda le legge.
 */

const dayValidator = v.object(weatherDays.validator.fields);

/**
 * Riscrive i giorni arrivati con l'ultima lettura: uno già presente si
 * aggiorna, uno nuovo si aggiunge. I giorni che la lettura non copre (quelli
 * più vecchi) restano come sono.
 */
export const store = internalMutation({
  args: { days: v.array(dayValidator) },
  handler: async (ctx, { days }) => {
    for (const day of days) {
      const existing = await ctx.db
        .query("weatherDays")
        .withIndex("by_day", (q) => q.eq("day", day.day))
        .unique();
      if (existing) await ctx.db.replace(existing._id, day);
      else await ctx.db.insert("weatherDays", day);
    }
    return { stored: days.length };
  },
});

/**
 * I giorni da `from` a `to` compresi, in ordine. L'agenda chiede tutta la
 * striscia in una volta: cambiando giorno il meteo è già lì, senza attese.
 *
 * Pubblica come gli orari del club: è il tempo che fa a Melilli, non un dato
 * di qualcuno.
 */
export const range = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    const rows = await ctx.db
      .query("weatherDays")
      .withIndex("by_day", (q) => q.gte("day", from).lte("day", to))
      .take(62);
    return rows.map(({ _id, _creationTime, ...row }) => row);
  },
});

/**
 * Per provare in locale la proposta di chiusura per maltempo: scrive un
 * pomeriggio di pioggia forte sulla riga di un giorno (oggi, se non si dice).
 * Interna, quindi solo da `convex run` (mai dal sito o dalla dashboard):
 *
 *   npx convex run modules/weather/data:simulateRain
 *   npx convex run modules/weather/data:simulateRain '{"from": 10, "to": 13, "storm": true}'
 *
 * La prossima lettura da Open-Meteo (mezzanotte o le 14) rimette la
 * previsione vera; per toglierla prima: `modules/weather/refresh:default
 * '{"force": true}'`.
 */
export const simulateRain = internalMutation({
  args: {
    day: v.optional(v.string()),
    /** Prima ora di pioggia, ora del club. */
    from: v.optional(v.number()),
    /** Ora in cui smette, esclusa. */
    to: v.optional(v.number()),
    storm: v.optional(v.boolean()),
  },
  handler: async (ctx, { day, from = 15, to = 19, storm = false }) => {
    const key = day ?? clubDayKey(Date.now());
    const row = await ctx.db
      .query("weatherDays")
      .withIndex("by_day", (q) => q.eq("day", key))
      .unique();
    if (!row) {
      throw new Error(
        `Nessun meteo per ${key}: prima lancia modules/weather/refresh:default '{"force": true}'.`,
      );
    }

    const hours = row.hours.map((hour) => {
      if (hour.hour < from || hour.hour >= to) return hour;
      // Più forte a metà del temporale, come un fronte che passa.
      const middle = (from + to - 1) / 2;
      const peak = 1 - Math.abs(hour.hour - middle) / Math.max(1, to - from);
      return {
        ...hour,
        code: storm ? 95 : peak > 0.7 ? 65 : 63,
        precipitation: Math.round((1.8 + peak * 3.5) * 10) / 10,
        precipitationProbability: Math.round(85 + peak * 12),
        wind: Math.max(hour.wind, 22),
        gusts: Math.max(hour.gusts, storm ? 58 : 38),
        temp: Math.round((hour.temp - 3) * 10) / 10,
      };
    });

    await ctx.db.patch(row._id, {
      hours,
      code: storm ? 95 : 65,
      precipitation:
        Math.round(hours.reduce((sum, hour) => sum + hour.precipitation, 0) * 10) /
        10,
      precipitationProbability: Math.max(
        ...hours.map((hour) => hour.precipitationProbability ?? 0),
      ),
      gustsMax: Math.max(...hours.map((hour) => hour.gusts)),
    });
    return { day: key, from, to, storm };
  },
});
