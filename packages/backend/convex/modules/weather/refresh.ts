import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { CLUB_TIME_ZONE } from "../../utils/clubTime";
import { clubMoment } from "../settings/lib";

/**
 * Le previsioni del meteo al club, da Open-Meteo.
 *
 * Open-Meteo è open source, non chiede chiavi e pubblica i dati sotto
 * CC BY 4.0: la dashboard lo cita accanto al meteo. Si legge due volte al
 * giorno, a mezzanotte (la giornata nuova con la previsione fresca) e alle 14
 * (l'aggiornamento dei modelli del mattino, in tempo per il pomeriggio e per
 * domani). L'agenda non chiama mai Open-Meteo: legge la tabella
 * (tables/weatherDays.ts), e la home non aspetta nessuno.
 *
 * Il cron è orario (crons.ts) e qui si guarda l'ora del club, come per i
 * promemoria (modules/reminders/emptyDays.ts): un cron giornaliero vive in
 * UTC e scivolerebbe di un'ora a ogni cambio dell'ora legale.
 */

/** Le ore del club a cui si rilegge. */
const REFRESH_HOURS = [0, 14];

/** Via Sandro Pertini, Melilli: il club. */
const CLUB_LATITUDE = 37.1777;
const CLUB_LONGITUDE = 15.1418;

/**
 * Ieri si rilegge un'ultima volta, con quel che i modelli sanno ormai di
 * com'è andata; in avanti, due settimane, quanto la striscia dell'agenda.
 */
const PAST_DAYS = 1;
const FORECAST_DAYS = 16;

const DAILY = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_gusts_10m_max",
  "sunrise",
  "sunset",
];

const HOURLY = [
  "weather_code",
  "temperature_2m",
  "precipitation",
  "precipitation_probability",
  "wind_speed_10m",
  "wind_gusts_10m",
  "is_day",
];

type Series = (number | null)[];

interface Forecast {
  daily: {
    time: string[];
    weather_code: Series;
    temperature_2m_max: Series;
    temperature_2m_min: Series;
    precipitation_sum: Series;
    precipitation_probability_max: Series;
    wind_gusts_10m_max: Series;
    sunrise: (string | null)[];
    sunset: (string | null)[];
  };
  hourly: {
    time: string[];
    weather_code: Series;
    temperature_2m: Series;
    precipitation: Series;
    precipitation_probability: Series;
    wind_speed_10m: Series;
    wind_gusts_10m: Series;
    is_day: Series;
  };
}

function forecastUrl() {
  const params = new URLSearchParams({
    latitude: String(CLUB_LATITUDE),
    longitude: String(CLUB_LONGITUDE),
    timezone: CLUB_TIME_ZONE,
    past_days: String(PAST_DAYS),
    forecast_days: String(FORECAST_DAYS),
    daily: DAILY.join(","),
    hourly: HOURLY.join(","),
    wind_speed_unit: "kmh",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

const round = (value: number | null | undefined, digits = 1) =>
  value == null ? 0 : Math.round(value * 10 ** digits) / 10 ** digits;

const optional = (value: number | null | undefined) =>
  value == null ? undefined : Math.round(value);

/** "2026-10-25T17:12" → "17:12": l'ora è già quella del club. */
const clock = (value: string | null | undefined) =>
  value ? value.slice(11, 16) : undefined;

/** La risposta di Open-Meteo, giorno per giorno, nella forma della tabella. */
function toDays(forecast: Forecast, fetchedAt: number) {
  const { daily, hourly } = forecast;

  return daily.time.flatMap((day, index) => {
    const code = daily.weather_code[index];
    const tempMax = daily.temperature_2m_max[index];
    const tempMin = daily.temperature_2m_min[index];
    // Un giorno senza i dati essenziali non si scrive: meglio la versione
    // precedente che una riga di zeri.
    if (code == null || tempMax == null || tempMin == null) return [];

    const hours = hourly.time.flatMap((time, hourIndex) => {
      if (!time.startsWith(day)) return [];
      const hourCode = hourly.weather_code[hourIndex];
      const temp = hourly.temperature_2m[hourIndex];
      if (hourCode == null || temp == null) return [];
      return [
        {
          hour: Number(time.slice(11, 13)),
          code: hourCode,
          temp: round(temp),
          precipitation: round(hourly.precipitation[hourIndex]),
          precipitationProbability: optional(
            hourly.precipitation_probability[hourIndex],
          ),
          wind: Math.round(hourly.wind_speed_10m[hourIndex] ?? 0),
          gusts: Math.round(hourly.wind_gusts_10m[hourIndex] ?? 0),
          isDay: hourly.is_day[hourIndex] === 1,
        },
      ];
    });

    return [
      {
        day,
        code,
        tempMax: round(tempMax),
        tempMin: round(tempMin),
        precipitation: round(daily.precipitation_sum[index]),
        precipitationProbability: optional(
          daily.precipitation_probability_max[index],
        ),
        gustsMax: optional(daily.wind_gusts_10m_max[index]),
        sunrise: clock(daily.sunrise[index]),
        sunset: clock(daily.sunset[index]),
        hours,
        fetchedAt,
      },
    ];
  });
}

export default internalAction({
  args: {
    /** Legge subito, a qualunque ora: per riempire la tabella da `convex run`. */
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, { force }): Promise<{ stored: number }> => {
    const now = Date.now();
    const hour = Math.floor(clubMoment(now).minutes / 60);
    if (!force && !REFRESH_HOURS.includes(hour)) return { stored: 0 };

    const response = await fetch(forecastUrl());
    if (!response.ok) {
      // Niente allarmi allo staff: il meteo è un di più, e le righe di prima
      // restano valide fino al prossimo giro.
      console.error(
        `Open-Meteo ha risposto ${response.status}: ${await response.text()}`,
      );
      return { stored: 0 };
    }

    const days = toDays((await response.json()) as Forecast, now);
    return await ctx.runMutation(internal.modules.weather.data.store, { days });
  },
});
