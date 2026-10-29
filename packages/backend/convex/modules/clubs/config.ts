import type { Doc } from "../../_generated/dataModel";
import { DEFAULT_CLUB_SLUG } from "./lib";

/**
 * Le configurazioni di un club: gli account dei servizi esterni che sono suoi
 * (docs/multi-club.md, Fase 2). Quelli della piattaforma restano nelle
 * variabili d'ambiente e non passano di qui: l'account Twilio, l'account di
 * servizio Google, le chiavi delle notifiche push, Resend, Clerk.
 *
 * Oggi le variabili d'ambiente sono di Padel Sport, e solo a Padel Sport si
 * danno. Un altro club che le ricevesse incasserebbe sull'account SumUp di
 * Padel Sport e scriverebbe ai suoi clienti dal numero WhatsApp di Padel
 * Sport. Per gli altri club ogni servizio risulta non configurato, come su un
 * deployment senza chiavi, finché la configurazione non avrà un posto per
 * club.
 *
 * Prende la riga del club e non l'id: chi chiama ce l'ha già (`ctx.club`, o
 * letta dal record che sta trattando), e quel posto per club può essere la
 * riga stessa senza cambiare chi lo usa.
 */
export interface ClubConfig {
  /** L'account SumUp su cui il club incassa. */
  sumup: { apiKey: string; merchantCode: string } | null;
  /**
   * I calendari Google del club: quello che si legge (le prenotazioni prese
   * su SumUp) e quello su cui si scrivono le nostre, di norma lo stesso.
   */
  calendar: { readCalendarId: string; writeCalendarId: string } | null;
  /** Il numero WhatsApp del club e i suoi template su Twilio. */
  whatsapp: {
    sender: string;
    bookingTemplateSid: string;
    matchInviteTemplateSid?: string;
  } | null;
}

const NOT_CONFIGURED: ClubConfig = {
  sumup: null,
  calendar: null,
  whatsapp: null,
};

/** Il template di conferma in uso prima che diventasse una variabile. */
const DEFAULT_BOOKING_TEMPLATE_SID = "HX59dcd979ad55c221765b52157430c98b";

const read = (value: string | undefined) => value?.trim() || undefined;

export function clubConfig(club: Pick<Doc<"clubs">, "slug">): ClubConfig {
  if (club.slug !== DEFAULT_CLUB_SLUG) return NOT_CONFIGURED;

  const apiKey = read(process.env.SUMUP_API_KEY);
  const merchantCode = read(process.env.SUMUP_MERCHANT_CODE);
  const readCalendarId = read(process.env.GOOGLE_CALENDAR_ID_READ);
  const writeCalendarId =
    read(process.env.GOOGLE_CALENDAR_ID_WRITE) ?? readCalendarId;
  const sender = read(process.env.TWILIO_PHONE_SENDER);

  return {
    sumup: apiKey && merchantCode ? { apiKey, merchantCode } : null,
    calendar:
      readCalendarId && writeCalendarId
        ? { readCalendarId, writeCalendarId }
        : null,
    whatsapp: sender
      ? {
          sender,
          // Sostituibile senza rilascio: cambiando il template su Twilio
          // basta aggiornare la variabile d'ambiente.
          bookingTemplateSid:
            read(process.env.TWILIO_BOOKING_TEMPLATE_SID) ??
            DEFAULT_BOOKING_TEMPLATE_SID,
          matchInviteTemplateSid: read(
            process.env.TWILIO_MATCH_INVITE_TEMPLATE_SID,
          ),
        }
      : null,
  };
}
