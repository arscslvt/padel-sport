"use node";

import { JWT } from "google-auth-library";

import {
  CLUB_TIME_ZONE,
  type ExternalBlock,
  SOURCE_PROPERTY,
  SOURCE_VALUE,
} from "./lib";

/**
 * Strato sottile sopra l'API Calendar di Google: quel tanto che serve a
 * leggere gli eventi di una finestra e a scriverci i nostri.
 *
 * Niente `googleapis`: il pacchetto intero pesa decine di megabyte per tre
 * chiamate REST, e le azioni Convex vanno impacchettate a ogni deploy.
 */

const CALENDAR_API = "https://www.googleapis.com/calendar/v3/calendars";
const SCOPE = "https://www.googleapis.com/auth/calendar.events";

interface GoogleEvent {
  id?: string;
  summary?: string;
  status?: string;
  transparency?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  extendedProperties?: { private?: Record<string, string> };
}

export interface CalendarConfig {
  /** Calendario da cui leggiamo gli appuntamenti presi su SumUp. */
  readCalendarId: string;
  /** Calendario su cui scriviamo le nostre prenotazioni. Di norma lo stesso. */
  writeCalendarId: string;
  clientEmail: string;
  privateKey: string;
}

/**
 * Configurazione dal deployment Convex, o `null` se manca.
 *
 * Il `null` non è un errore: finché il club non ha creato il service account,
 * la sincronizzazione semplicemente non esiste e tutto continua a funzionare
 * come prima.
 */
export function calendarConfig(): CalendarConfig | null {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  const readCalendarId = process.env.GOOGLE_CALENDAR_ID_READ;
  const writeCalendarId =
    process.env.GOOGLE_CALENDAR_ID_WRITE ?? readCalendarId;

  if (!clientEmail || !privateKey || !readCalendarId || !writeCalendarId) {
    return null;
  }

  return {
    readCalendarId,
    writeCalendarId,
    clientEmail,
    // Le chiavi passano dalle variabili d'ambiente con gli a capo scritti
    // letteralmente: senza ripristinarli il PEM non è valido.
    privateKey: privateKey.replace(/\\n/g, "\n"),
    };
}

async function accessToken(config: CalendarConfig): Promise<string> {
  const jwt = new JWT({
    email: config.clientEmail,
    key: config.privateKey,
    scopes: [SCOPE],
  });

  const { access_token } = await jwt.authorize();
  if (!access_token) {
    throw new Error("Google non ha rilasciato un token per il calendario.");
  }

  return access_token;
}

/**
 * `missingIsFine` vale solo per la cancellazione, dove un evento già sparito è
 * il risultato voluto. Ovunque altro un 404 va sollevato: è come si scopre che
 * il calendario non è condiviso con il service account, e ingoiarlo
 * significherebbe una sincronizzazione che dice di funzionare senza fare nulla.
 */
async function call(
  config: CalendarConfig,
  path: string,
  init?: RequestInit & { missingIsFine?: boolean },
): Promise<Response> {
  const token = await accessToken(config);
  const { missingIsFine, ...request } = init ?? {};

  const response = await fetch(`${CALENDAR_API}/${path}`, {
    ...request,
    headers: {
      ...request.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const gone = response.status === 404 || response.status === 410;
  if (!response.ok && !(missingIsFine && gone)) {
    throw new Error(
      `Calendar API ${response.status}: ${await response.text()}`,
    );
  }

  return response;
}

/** Mezzanotte del giorno indicato, nell'ora della struttura. */
function startOfClubDay(isoDate: string): number {
  // `sv-SE` formatta come `YYYY-MM-DD HH:mm:ss`: comodo per leggere lo scarto
  // fra l'ora locale del club e UTC nel giorno giusto, DST compreso.
  const noonUtc = new Date(`${isoDate}T12:00:00Z`);
  const asClub = new Intl.DateTimeFormat("sv-SE", {
    timeZone: CLUB_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).format(noonUtc);

  const offsetHours = 12 - Number(asClub);
  return new Date(`${isoDate}T00:00:00Z`).getTime() + offsetHours * 3600 * 1000;
}

function toBlock(event: GoogleEvent): ExternalBlock | null {
  if (!event.id || event.status === "cancelled") return null;

  // Chi si segna l'evento come «libero» non sta occupando un campo.
  if (event.transparency === "transparent") return null;

  // I nostri: già contati come prenotazioni, non vanno contati due volte.
  if (event.extendedProperties?.private?.[SOURCE_PROPERTY] === SOURCE_VALUE) {
    return null;
  }

  const startIso = event.start?.dateTime;
  const endIso = event.end?.dateTime;

  if (startIso && endIso) {
    return {
      externalId: event.id,
      start: new Date(startIso).getTime(),
      end: new Date(endIso).getTime(),
      title: event.summary,
      allDay: false,
    };
  }

  // Evento «tutto il giorno»: `end.date` è esclusivo, come da specifica.
  if (event.start?.date && event.end?.date) {
    return {
      externalId: event.id,
      start: startOfClubDay(event.start.date),
      end: startOfClubDay(event.end.date),
      title: event.summary,
      allDay: true,
    };
  }

  return null;
}

/** Occupazioni esterne nella finestra richiesta, già normalizzate. */
export async function listBlocks(
  config: CalendarConfig,
  from: number,
  to: number,
): Promise<ExternalBlock[]> {
  const params = new URLSearchParams({
    timeMin: new Date(from).toISOString(),
    timeMax: new Date(to).toISOString(),
    // Le ricorrenze vanno espanse: ci interessano le occorrenze, non la regola.
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const response = await call(
    config,
    `${encodeURIComponent(config.readCalendarId)}/events?${params}`,
  );

  if (!response.ok) return [];

  const payload = (await response.json()) as { items?: GoogleEvent[] };

  return (payload.items ?? [])
    .map(toBlock)
    .filter((block): block is ExternalBlock => block !== null);
}

/** Scrive una nostra prenotazione sul calendario e ne restituisce l'id. */
export async function insertBooking(
  config: CalendarConfig,
  booking: {
    start: number;
    end: number;
    summary: string;
    description: string;
  },
): Promise<string | null> {
  const response = await call(
    config,
    `${encodeURIComponent(config.writeCalendarId)}/events`,
    {
      method: "POST",
      body: JSON.stringify({
        summary: booking.summary,
        description: booking.description,
        start: { dateTime: new Date(booking.start).toISOString() },
        end: { dateTime: new Date(booking.end).toISOString() },
        transparency: "opaque",
        extendedProperties: {
          private: { [SOURCE_PROPERTY]: SOURCE_VALUE },
        },
      }),
    },
  );

  if (!response.ok) return null;

  const created = (await response.json()) as GoogleEvent;
  return created.id ?? null;
}

/** Toglie l'evento di una prenotazione disdetta. Il 404 va bene: non c'è più. */
export async function deleteBooking(
  config: CalendarConfig,
  eventId: string,
): Promise<void> {
  await call(
    config,
    `${encodeURIComponent(config.writeCalendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", missingIsFine: true },
  );
}
