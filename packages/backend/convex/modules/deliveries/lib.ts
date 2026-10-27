import type { Infer } from "convex/values";

import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { MutationCtx } from "../../_generated/server";
import type {
  deliveryChannel,
  deliveryEntry,
  deliveryStatus,
  notificationKind,
} from "../../tables/bookingDeliveries";
import { formatClubDateTime } from "../../utils/clubTime";
import { staffBookingUrl } from "../../utils/staffLinks";
import { defaultClubId } from "../clubs/lib";

/**
 * Le regole del registro degli avvisi ai clienti (tables/bookingDeliveries.ts):
 * come matura uno stato, come si leggono gli errori di Resend e Twilio, quando
 * lo staff va avvisato.
 */

export type DeliveryStatus = Infer<typeof deliveryStatus>;
export type DeliveryChannel = Infer<typeof deliveryChannel>;
export type NotificationKind = Infer<typeof notificationKind>;

export type DeliveryEntry = Infer<typeof deliveryEntry>;

/**
 * Il grado di uno stato: uno nuovo prende il posto del vecchio solo se è più
 * avanti. I webhook arrivano in disordine — Twilio può mandare `delivered`
 * prima di `sent` — e senza questa regola la riga tornerebbe indietro.
 *
 * Il fallimento sta in cima: un messaggio partito e poi non consegnato è non
 * consegnato. `delayed` vale quanto `sent`: è un «ci sto provando».
 */
const RANK: Record<DeliveryStatus, number> = {
  skipped: 0,
  queued: 1,
  sent: 2,
  delayed: 2,
  delivered: 3,
  read: 4,
  complained: 4,
  failed: 5,
};

export function advances(current: DeliveryStatus, next: DeliveryStatus) {
  if (current === next) return false;
  // Un rinvio che poi parte torna «inviato»: è l'unico passo laterale.
  if (current === "delayed" && next === "sent") return true;
  return RANK[next] > RANK[current];
}

/* -------------------------------------------------------------------------- */
/*                                   Twilio                                   */
/* -------------------------------------------------------------------------- */

/**
 * Gli errori di WhatsApp che allo sportello si incontrano davvero, detti come
 * li direbbe lo staff al cliente. Gli altri restano col loro codice, che è
 * quello da cercare nella documentazione di Twilio.
 */
const TWILIO_ERRORS: Record<number, string> = {
  21211: "Numero di telefono non valido",
  21610: "Il cliente ha chiesto di non ricevere messaggi",
  63003: "Il numero non è su WhatsApp",
  63016: "Messaggio fuori dalla finestra di 24 ore: serve un template approvato",
  63024: "Destinatario non valido per WhatsApp",
};

export function twilioErrorDetail(code: unknown, fallback?: string) {
  const numeric = Number(code);
  if (Number.isFinite(numeric) && numeric > 0) {
    return TWILIO_ERRORS[numeric] ?? `Errore Twilio ${numeric}`;
  }
  return fallback ?? "Twilio non ha consegnato il messaggio";
}

/** Lo stato di un messaggio come lo chiama Twilio, nel nostro vocabolario. */
export function fromTwilioStatus(status: string): DeliveryStatus | null {
  switch (status) {
    case "accepted":
    case "scheduled":
    case "queued":
    case "sending":
      return "queued";
    case "sent":
      return "sent";
    case "delivered":
      return "delivered";
    case "read":
      return "read";
    case "undelivered":
    case "failed":
    case "canceled":
      return "failed";
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   Resend                                   */
/* -------------------------------------------------------------------------- */

type ResendEvent = {
  type: string;
  data?: {
    email_id?: string;
    bounce?: { type?: string; subType?: string; message?: string };
    failed?: { reason?: string };
  };
};

/**
 * Un evento del webhook di Resend, tradotto. `null` per quelli che non
 * cambiano niente qui: aperture e clic non sono la risposta a «gli è
 * arrivata?», e gli eventi di contatti e domini non riguardano le mail.
 */
export function fromResendEvent(
  event: ResendEvent,
): { status: DeliveryStatus; detail?: string } | null {
  switch (event.type) {
    case "email.sent":
      return { status: "sent" };
    case "email.delivered":
      return { status: "delivered" };
    case "email.delivery_delayed":
      return {
        status: "delayed",
        detail: "Il server di posta del cliente ha rimandato: Resend riprova",
      };
    case "email.complained":
      return { status: "complained", detail: "Il cliente l'ha segnata come spam" };
    case "email.bounced":
      return {
        status: "failed",
        detail:
          event.data?.bounce?.type === "Permanent"
            ? "Indirizzo inesistente o rifiutato dal server di posta"
            : "Casella non raggiungibile",
      };
    case "email.suppressed":
      return {
        status: "failed",
        detail:
          "Indirizzo bloccato da Resend per rimbalzi o segnalazioni precedenti",
      };
    case "email.failed":
      return {
        status: "failed",
        detail: event.data?.failed?.reason ?? "Resend non ha potuto spedirla",
      };
    default:
      return null;
  }
}

/* -------------------------------------------------------------------------- */
/*                                Registrazione                               */
/* -------------------------------------------------------------------------- */

const FAILURE_TITLES: Record<NotificationKind, string> = {
  accepted: "⚠️ Conferma non comunicata",
  merged: "⚠️ Unione dei campi non comunicata",
  cancelled_by_club: "⚠️ Disdetta non comunicata",
  cancelled_by_player: "⚠️ Disdetta non comunicata",
  rescheduled: "⚠️ Cambio d'orario non comunicato",
  invited: "⚠️ Invito non recapitato",
};

const CHANNEL_LABELS: Record<DeliveryChannel, string> = {
  email: "Email",
  whatsapp: "WhatsApp",
};

/**
 * Avvisa lo staff che chi ha prenotato non ha ricevuto un messaggio.
 *
 * Solo per chi ha prenotato: è lui che aspetta la conferma, ed è lui che lo
 * staff può chiamare. Le mail rimbalzate dei compagni di gioco restano nella
 * scheda, senza far suonare il telefono.
 */
export async function alertFailure(
  ctx: MutationCtx,
  booking: Doc<"bookings">,
  delivery: Pick<
    Doc<"bookingDeliveries">,
    "_id" | "kind" | "channel" | "role" | "recipient" | "detail"
  >,
) {
  if (delivery.role !== "booker") return;

  const to = delivery.recipient ? ` a ${delivery.recipient}` : "";

  await ctx.scheduler.runAfter(0, internal.modules.notifications.alert.default, {
    category: "deliveries",
    title: FAILURE_TITLES[delivery.kind],
    message: `${booking.bookedBy}, ${formatClubDateTime(booking.bookingDate)}. ${
      CHANNEL_LABELS[delivery.channel]
    }${to}: ${delivery.detail ?? "non recapitato"}. Avvisare a mano.`,
    url: staffBookingUrl(booking._id),
    idempotencyKey: `delivery-failed-${delivery._id}`,
  });
}

/**
 * Scrive le righe di un tentativo. Lo usano le mutation che sanno già, senza
 * uscire in rete, che un avviso non partirà (manca il numero, lo staff l'ha
 * escluso) e le azioni che l'hanno appena tentato (modules/deliveries/record.ts).
 */
export async function recordDeliveries(
  ctx: MutationCtx,
  bookingId: Id<"bookings">,
  kind: NotificationKind,
  channel: DeliveryChannel,
  entries: DeliveryEntry[],
) {
  const booking = await ctx.db.get(bookingId);
  if (!booking) return;

  const now = Date.now();
  const clubId = await defaultClubId(ctx);

  for (const entry of entries) {
    const row = {
      clubId,
      bookingId,
      kind,
      channel,
      ...entry,
      createdAt: now,
      updatedAt: now,
    };
    const _id = await ctx.db.insert("bookingDeliveries", row);

    if (entry.status === "failed") {
      await alertFailure(ctx, booking, { _id, ...row });
    }
  }
}
