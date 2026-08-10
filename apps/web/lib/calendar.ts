import { getInfo } from "@/lib/info";

/** Durata di default quando l'evento non ha una data di fine. */
const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

export type CalendarEvent = {
  title: string;
  description: string;
  /** ISO 8601, come arriva da Sanity. */
  dateStart: string;
  dateEnd?: string | null;
  url: string;
};

export function eventLocation() {
  return getInfo("address") ?? "Melilli (SR), Italia";
}

function resolveRange(event: CalendarEvent) {
  const start = new Date(event.dateStart);
  const end = event.dateEnd
    ? new Date(event.dateEnd)
    : new Date(start.getTime() + DEFAULT_DURATION_MS);

  return { start, end };
}

/** `YYYYMMDDTHHMMSSZ`: usiamo sempre UTC così non serve dichiarare una VTIMEZONE. */
function toCompactUtc(value: Date) {
  return `${value.toISOString().replace(/[-:]/g, "").split(".")[0]}Z`;
}

/** Escape dei caratteri riservati da RFC 5545. */
function escapeText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * RFC 5545 impone righe da massimo 75 ottetti: quelle più lunghe vanno spezzate
 * e continuate con uno spazio iniziale. Restiamo sotto la soglia per stare
 * larghi con i caratteri accentati, che occupano 2 byte.
 */
function foldLine(line: string) {
  if (line.length <= 70) return line;

  const chunks: string[] = [line.slice(0, 70)];
  let rest = line.slice(70);

  while (rest.length > 69) {
    chunks.push(` ${rest.slice(0, 69)}`);
    rest = rest.slice(69);
  }

  if (rest.length) chunks.push(` ${rest}`);

  return chunks.join("\r\n");
}

export function buildICS(event: CalendarEvent, uid: string) {
  const { start, end } = resolveRange(event);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ASD Padel Sport Melilli//Eventi//IT",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${toCompactUtc(new Date())}`,
    `DTSTART:${toCompactUtc(start)}`,
    `DTEND:${toCompactUtc(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    `LOCATION:${escapeText(eventLocation())}`,
    `URL:${escapeText(event.url)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return `${lines.map(foldLine).join("\r\n")}\r\n`;
}

export function googleCalendarUrl(event: CalendarEvent) {
  const { start, end } = resolveRange(event);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toCompactUtc(start)}/${toCompactUtc(end)}`,
    details: `${event.description}\n\n${event.url}`,
    location: eventLocation(),
  });

  return `https://calendar.google.com/calendar/render?${params}`;
}

export function outlookCalendarUrl(event: CalendarEvent) {
  const { start, end } = resolveRange(event);

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: `${event.description}\n\n${event.url}`,
    location: eventLocation(),
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
}
