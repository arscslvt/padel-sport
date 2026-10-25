import type { api } from "@padel-sport/backend/convex/_generated/api";
import {
  type Schedule,
  windowsForDay,
} from "@padel-sport/backend/convex/modules/settings/schedule";
import type { FunctionReturnType } from "convex/server";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  type LucideIcon,
  Moon,
  Sun,
} from "lucide-react";

import { CLUB_TIME_ZONE } from "@/lib/booking";

/**
 * Il meteo in agenda, letto per chi deve decidere: «oggi piove sui campi?».
 *
 * I codici sono quelli WMO che usa Open-Meteo; il responso guarda le ore di
 * apertura del giorno, non la notte, e per oggi solo quelle che restano.
 */

export type WeatherDay = FunctionReturnType<
  typeof api.modules.weather.data.range
>[number];

export type WeatherHour = WeatherDay["hours"][number];

/** La famiglia di cielo: decide l'icona e la velatura del riquadro. */
export type Sky = "sun" | "cloud" | "rain" | "storm";

interface Condition {
  label: string;
  sky: Sky;
  icon: LucideIcon;
  night?: LucideIcon;
}

function condition(code: number): Condition {
  if (code === 0)
    return { label: "Sereno", sky: "sun", icon: Sun, night: Moon };
  if (code === 1) {
    return { label: "Quasi sereno", sky: "sun", icon: Sun, night: Moon };
  }
  if (code === 2) {
    return {
      label: "Poco nuvoloso",
      sky: "sun",
      icon: CloudSun,
      night: CloudMoon,
    };
  }
  if (code === 3) return { label: "Coperto", sky: "cloud", icon: Cloud };
  if (code === 45 || code === 48) {
    return { label: "Nebbia", sky: "cloud", icon: CloudFog };
  }
  if (code >= 51 && code <= 57) {
    return { label: "Pioviggine", sky: "rain", icon: CloudDrizzle };
  }
  if (code === 61 || code === 80) {
    return { label: "Pioggia debole", sky: "rain", icon: CloudRain };
  }
  if (code === 65 || code === 82) {
    return { label: "Pioggia forte", sky: "rain", icon: CloudRain };
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { label: "Pioggia", sky: "rain", icon: CloudRain };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { label: "Neve", sky: "rain", icon: CloudSnow };
  }
  if (code >= 95) {
    return { label: "Temporale", sky: "storm", icon: CloudLightning };
  }
  return { label: "Variabile", sky: "cloud", icon: Cloud };
}

export function conditionLabel(code: number): string {
  return condition(code).label;
}

export function skyOf(code: number): Sky {
  return condition(code).sky;
}

export function conditionIcon(code: number, isDay = true): LucideIcon {
  const { icon, night } = condition(code);
  return isDay ? icon : (night ?? icon);
}

/** La probabilità di pioggia di un'ora; sui giorni passati la si deduce. */
export function rainChance(hour: WeatherHour): number {
  if (hour.precipitationProbability !== undefined) {
    return hour.precipitationProbability;
  }
  return hour.precipitation >= 0.2 ? 80 : 0;
}

const isWet = (hour: WeatherHour) =>
  rainChance(hour) >= 40 || hour.precipitation >= 0.3;

const isStorm = (hour: WeatherHour) =>
  hour.code >= 95 && rainChance(hour) >= 30;

/** Le ore da guardare: dall'apertura alla chiusura, per quel giorno. */
export function playingHours(
  schedule: Schedule | undefined,
  day: string,
): number[] {
  const weekday = new Date(`${day}T12:00:00`).getDay();
  const windows = schedule ? windowsForDay(schedule, day, weekday) : [];
  if (windows.length === 0) return range(9, 22);

  const hours = new Set<number>();
  for (const window of windows) {
    const [startHour] = window.start.split(":").map(Number);
    const [endHour, endMinute] = window.end.split(":").map(Number);
    for (
      let hour = startHour;
      hour < endHour + (endMinute > 0 ? 1 : 0);
      hour++
    ) {
      hours.add(hour);
    }
  }
  // Una sola fila continua, pausa compresa: il grafico non salta le ore.
  const sorted = [...hours].sort((a, b) => a - b);
  return range(sorted[0], sorted[sorted.length - 1] + 1);
}

function range(from: number, to: number) {
  return Array.from({ length: to - from }, (_, index) => from + index);
}

const clubHourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: CLUB_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

export function clubHour(now: number): number {
  return Number(clubHourFormat.format(now));
}

export type Tone = "dry" | "maybe" | "rain" | "storm";

export interface Verdict {
  tone: Tone;
  title: string;
  detail: string;
  /**
   * Il cielo delle ore guardate, il più severo: il codice della giornata
   * intera mette il temporale delle tre di notte anche su un pomeriggio di
   * sole.
   */
  code: number;
}

/** «dalle 16 alle 19», «verso le 16». */
function span(hours: WeatherHour[]): string {
  if (hours.length === 0) return "nelle ore di apertura";
  const first = hours[0].hour;
  const last = hours[hours.length - 1].hour + 1;
  return last - first <= 1
    ? `verso le ${first}`
    : `dalle ${first} alle ${last}`;
}

const capitalize = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * Il responso del giorno, in una frase e un dettaglio.
 *
 * Un giorno passato si racconta al passato, con la pioggia caduta; oggi
 * conta quel che resta della giornata; gli altri giorni tutte le ore di
 * apertura. Le raffiche forti si aggiungono in coda, perché sul campo si
 * sentono anche senza pioggia.
 */
export function verdict(
  weather: WeatherDay,
  hours: number[],
  when: "past" | "today" | "future",
  now: number,
): Verdict {
  const open = weather.hours.filter((hour) => hours.includes(hour.hour));
  const remaining =
    when === "today" ? open.filter((hour) => hour.hour >= clubHour(now)) : open;
  // Oggi a giornata finita si guarda indietro, come per un giorno passato.
  const past = when === "past" || (when === "today" && remaining.length === 0);
  const considered = past ? open : remaining;

  const gusts = Math.max(0, ...considered.map((hour) => hour.gusts));
  const wind = gusts >= 45 ? ` Raffiche fino a ${Math.round(gusts)} km/h.` : "";

  if (considered.length === 0) {
    return {
      tone: "dry",
      title: conditionLabel(weather.code),
      detail: "Nessun dato ora per ora.",
      code: weather.code,
    };
  }
  const code = Math.max(...considered.map((hour) => hour.code));

  if (past) {
    const fallen = considered.reduce(
      (sum, hour) => sum + hour.precipitation,
      0,
    );
    const wet = considered.filter((hour) => hour.precipitation >= 0.1);
    if (considered.some((hour) => hour.code >= 95 && hour.precipitation > 0)) {
      return {
        tone: "storm",
        title: "Ci sono stati temporali",
        detail: `${capitalize(span(wet))}, circa ${formatMm(fallen)}.${wind}`,
        code,
      };
    }
    if (fallen >= 0.5) {
      return {
        tone: "rain",
        title: "È piovuto",
        detail: `${capitalize(span(wet))}, circa ${formatMm(fallen)}.${wind}`,
        code,
      };
    }
    return {
      tone: "dry",
      title: "Giornata asciutta",
      detail: `Nessuna pioggia nelle ore di apertura.${wind}`,
      code,
    };
  }

  const peak = considered.reduce((best, hour) =>
    rainChance(hour) > rainChance(best) ? hour : best,
  );
  const chance = rainChance(peak);
  const storms = considered.filter(isStorm);
  const wet = considered.filter(isWet);

  if (storms.length > 0) {
    return {
      tone: "storm",
      title: "Possibili temporali",
      detail: `${capitalize(span(storms))}, fino al ${chance}%.${wind}`,
      code,
    };
  }
  if (chance >= 50 && wet.length > 0) {
    return {
      tone: "rain",
      title: "Pioggia probabile",
      detail: `${capitalize(span(wet))}, fino al ${chance}%.${wind}`,
      code,
    };
  }
  if (chance >= 25) {
    return {
      tone: "maybe",
      title: "Qualche goccia possibile",
      detail: `Al massimo il ${chance}% verso le ${peak.hour}.${wind}`,
      code,
    };
  }
  return {
    tone: "dry",
    title: "Niente pioggia in vista",
    detail: `${conditionLabel(weather.code)}, si gioca all'asciutto.${wind}`,
    code,
  };
}

function formatMm(mm: number) {
  return `${mm < 1 ? mm.toFixed(1).replace(".", ",") : Math.round(mm)} mm`;
}

/**
 * La chiusura per maltempo da proporre allo staff, se il tempo è davvero
 * brutto: non per quattro gocce, ma quando sui campi all'aperto non si può
 * giocare.
 *
 * Un'ora è impraticabile se la pioggia è quasi certa e abbondante (almeno il
 * 70% e un millimetro nell'ora: il campo si allaga e i vetri grondano), se
 * piove forte anche con qualche dubbio in più (2,5 mm al 50%), o se c'è
 * temporale. Le ore impraticabili vicine fanno un episodio unico: un'ora
 * asciutta in mezzo non basta a giocare. Si propone di chiudere solo per un
 * episodio che conta davvero: almeno due ore e 3 mm, o 5 mm in tutto, o un
 * temporale.
 *
 * I campi poi devono asciugarsi: la chiusura non finisce con la pioggia ma
 * dopo un'ora se ne sono caduti meno di 4 mm, due fino a 12, tre oltre.
 * E un pezzo di apertura troppo corto per una partita, prima o dopo la
 * chiusura, si chiude con lei: aprire mezz'ora non serve a nessuno.
 *
 * Si guardano le ore di apertura, e oggi solo quelle che restano.
 */

/** Quanto dura una partita: un pezzo di apertura più corto non serve. */
const MATCH_MINUTES = 90;

export interface ClosedRange {
  /** Minuti dalla mezzanotte, ora del club. */
  start: number;
  end: number;
  /** Quando comincia a piovere: la chiusura può partire prima (un pezzo
   * di apertura troppo corto per una partita). */
  rainStart: number;
  /** Quando smette di piovere: dopo, i campi asciugano. */
  rainEnd: number;
}

export interface ClosureProposal {
  ranges: ClosedRange[];
  /** Millimetri e probabilità più alta nelle ore di pioggia. */
  mm: number;
  chance: number;
  storm: boolean;
  /**
   * La giornata è quasi tutta da chiudere: meglio chiuderla intera, e il
   * pulsante principale lo dice.
   */
  fullDay: boolean;
}

const unplayable = (hour: WeatherHour) => {
  const chance = rainChance(hour);
  return (
    (chance >= 70 && hour.precipitation >= 1) ||
    (chance >= 50 && hour.precipitation >= 2.5) ||
    (hour.code >= 95 && chance >= 60)
  );
};

function dryingHours(mm: number): number {
  if (mm < 4) return 1;
  if (mm < 12) return 2;
  return 3;
}

export function closureProposal(
  weather: WeatherDay,
  schedule: Schedule | undefined,
  day: string,
  when: "past" | "today" | "future",
  now: number,
): ClosureProposal | null {
  if (when === "past" || !schedule) return null;

  const weekday = new Date(`${day}T12:00:00`).getDay();
  const windows = windowsForDay(schedule, day, weekday).map((window) => ({
    start: toMinutes(window.start),
    end: toMinutes(window.end),
  }));
  if (windows.length === 0) return null;

  const fromHour = when === "today" ? clubHour(now) : 0;
  const isOpen = (hour: number) =>
    windows.some(
      (window) => hour * 60 < window.end && window.start < (hour + 1) * 60,
    );
  const open = weather.hours.filter(
    (hour) => hour.hour >= fromHour && isOpen(hour.hour),
  );
  const wet = open.filter(unplayable);
  if (wet.length === 0) return null;

  // Gli episodi: ore impraticabili con al massimo un'ora asciutta in mezzo.
  const episodes: WeatherHour[][] = [];
  for (const hour of wet) {
    const last = episodes[episodes.length - 1];
    if (last && hour.hour - last[last.length - 1].hour <= 2) last.push(hour);
    else episodes.push([hour]);
  }

  const lastClose = Math.max(...windows.map((window) => window.end));
  const firstOpen =
    when === "today"
      ? Math.max(fromHour * 60, Math.min(...windows.map((w) => w.start)))
      : Math.min(...windows.map((window) => window.start));

  let mm = 0;
  let chance = 0;
  let storm = false;
  const ranges: ClosedRange[] = [];

  for (const episode of episodes) {
    const rain = episode.reduce((sum, hour) => sum + hour.precipitation, 0);
    const stormy = episode.some((hour) => hour.code >= 95);
    const counts = stormy || rain >= 5 || (episode.length >= 2 && rain >= 3);
    if (!counts) continue;

    mm += rain;
    chance = Math.max(chance, ...episode.map(rainChance));
    storm ||= stormy;

    const rainStart = episode[0].hour * 60;
    const rainEnd = (episode[episode.length - 1].hour + 1) * 60;
    ranges.push({
      start: Math.max(rainStart, firstOpen),
      end: Math.min(rainEnd + dryingHours(rain) * 60, lastClose),
      rainStart: Math.max(rainStart, firstOpen),
      rainEnd: Math.min(rainEnd, lastClose),
    });
  }
  if (ranges.length === 0) return null;

  // Si allargano ai bordi delle fasce di apertura quando resterebbe un pezzo
  // troppo corto per giocare, e si uniscono quelle che si toccano.
  for (const range of ranges) {
    for (const window of windows) {
      if (range.start > window.start && range.start < window.end) {
        if (range.start - window.start < MATCH_MINUTES) {
          range.start = Math.max(window.start, firstOpen);
        }
      }
      if (range.end > window.start && range.end < window.end) {
        if (window.end - range.end < MATCH_MINUTES) range.end = window.end;
      }
    }
  }
  const merged: ClosedRange[] = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) {
      last.end = Math.max(last.end, range.end);
      last.rainStart = Math.min(last.rainStart, range.rainStart);
      last.rainEnd = Math.max(last.rainEnd, range.rainEnd);
    } else merged.push({ ...range });
  }

  // Quanto resta aperto, nelle ore che contano: se non ci sta più una
  // partita, o resta meno di un quarto, la giornata è da chiudere intera.
  const openMinutes = windows.reduce(
    (sum, window) =>
      sum + Math.max(0, window.end - Math.max(window.start, firstOpen)),
    0,
  );
  const closedMinutes = merged.reduce(
    (sum, range) =>
      sum +
      windows.reduce(
        (inner, window) =>
          inner +
          Math.max(
            0,
            Math.min(range.end, window.end) -
              Math.max(range.start, window.start),
          ),
        0,
      ),
    0,
  );
  const leftover = openMinutes - closedMinutes;

  return {
    ranges: merged,
    mm: Math.round(mm * 10) / 10,
    chance,
    storm,
    fullDay: leftover < MATCH_MINUTES || closedMinutes / openMinutes >= 0.75,
  };
}

/** 990 → "16:30", per la chiusura. */
export function clockOf(minutes: number): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/** 990 → «16:30», 960 → «16»: come si dice a voce. */
export function spokenTime(minutes: number): string {
  return minutes % 60 === 0 ? String(minutes / 60) : clockOf(minutes);
}

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}
