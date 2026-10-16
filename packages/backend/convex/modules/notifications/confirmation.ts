"use node";

import { api, internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { getMessagingClient } from "../../utils/notification_client";
import { v } from "convex/values";
import { formatClubDateTime } from "../../utils/clubTime";
import {
  type DeliveryEntry,
  fromTwilioStatus,
  twilioErrorDetail,
} from "../deliveries/lib";

/**
 * Il WhatsApp di conferma, col template approvato su Twilio: a chi ha
 * prenotato, o con `playerId` a un giocatore della prenotazione
 * (bookingPlayers.ts). Il messaggio è lo stesso, cambia il nome nel saluto.
 *
 * Ogni tentativo lascia una riga in `bookingDeliveries`, anche quando non
 * parte: chi guarda la scheda deve poter distinguere «non c'era il numero» da
 * «Twilio l'ha rifiutato» da «consegnato». Dopo l'invio la riga matura da sola
 * con lo `statusCallback` (http.ts), fino a «letto».
 */
export const sendConfirmationWithWhatsapp = internalAction({
  args: {
    bookingId: v.id("bookings"),
    /** Un giocatore della prenotazione invece di chi l'ha presa. */
    playerId: v.optional(v.id("players")),
  },
  handler: async (ctx, { bookingId, playerId }) => {
    const booking = await ctx.runQuery(api.bookings.get.getById, { bookingId });

    const player = playerId
      ? await ctx.runQuery(
          internal.modules.notifications.bookingPlayers.contact,
          { playerId },
        )
      : null;
    if (playerId && !player) return;

    const target = player
      ? { role: "player" as const, playerId, name: player.name }
      : { role: "booker" as const };
    const phone = player ? player.phone : booking.phone;
    const greeting = player ? player.firstName : booking.bookedBy;

    const record = (entry: Omit<DeliveryEntry, "role" | "playerId" | "name">) =>
      ctx.runMutation(internal.modules.deliveries.record.default, {
        bookingId,
        kind: "accepted",
        channel: "whatsapp",
        entries: [{ ...target, recipient: phone, ...entry }],
      });

    // Lo stato sulla prenotazione è di chi l'ha presa: lo legge chi conferma,
    // per non mandargli il WhatsApp due volte.
    const markStatus = async (
      newStatus: "sent_with_whatsapp" | "failed_to_send_whatsapp",
    ) => {
      if (player) return;
      await ctx.runMutation(internal.bookings.update.notificationStatus, {
        bookingId,
        newStatus,
      });
    };
    const markFailed = () => markStatus("failed_to_send_whatsapp");

    if (!booking.code) {
      console.error("WhatsApp di conferma non inviato: prenotazione senza codice.");
      await record({
        status: "failed",
        detail: "Prenotazione senza codice",
      });
      await markFailed();
      return;
    }

    // Le prenotazioni nate nell'app non raccolgono il recapito: senza, il
    // messaggio partirebbe verso `whatsapp:undefined` a ogni tentativo. La
    // conferma è comunque già andata via mail.
    if (!phone) {
      await record({
        status: "skipped",
        detail: "Nessun numero di telefono",
      });
      return;
    }

    const sender = process.env.TWILIO_PHONE_SENDER;
    if (!sender || !process.env.TWILIO_SID || !process.env.TWILIO_AUTH) {
      console.warn(
        "WhatsApp di conferma non inviato: TWILIO_SID, TWILIO_AUTH o TWILIO_PHONE_SENDER mancanti.",
      );
      await record({
        status: "failed",
        detail: "Invio WhatsApp non configurato",
      });
      await markFailed();
      return;
    }

    // Nell'ora del club, non in quella del server: le funzioni Convex girano
    // su UTC, e finché questa riga usava il fuso di sistema il messaggio
    // annunciava le 13:00 per una partita delle 15:00.
    const humanDate = formatClubDateTime(booking.bookingDate, " alle ");

    /**
     * Le variabili del template approvato su Twilio, in ordine.
     *
     * La terza è il codice, e il template ci costruisce sopra l'URL del
     * pulsante (`/booking/{{3}}`): il link non va passato a parte. È il motivo
     * per cui quella pagina si chiama `/booking/[code]` e non altro — se un
     * giorno cambia il percorso, il template su Twilio va rifatto e riapprovato.
     */
    const vars = {
      "1": greeting,
      "2": humanDate,
      "3": booking.code,
    };

    // Twilio richiama qui a ogni passo del messaggio (inviato, consegnato,
    // letto, non consegnato). Senza l'indirizzo del deployment il messaggio
    // parte lo stesso, ma la riga si ferma a «in coda».
    const siteUrl = process.env.CONVEX_SITE_URL;

    try {
      const client = getMessagingClient();
      const message = await client.messages.create({
        from: `whatsapp:${sender}`, // o numero business
        to: `whatsapp:${phone}`, // numero del cliente
        // Sostituibile senza rilascio: cambiando il template su Twilio basta
        // aggiornare la variabile d'ambiente.
        contentSid:
          process.env.TWILIO_BOOKING_TEMPLATE_SID ??
          "HX59dcd979ad55c221765b52157430c98b",
        contentVariables: JSON.stringify(vars),
        ...(siteUrl ? { statusCallback: `${siteUrl}/webhooks/twilio` } : {}),
      });

      await record({
        status: fromTwilioStatus(message.status) ?? "queued",
        providerId: message.sid,
      });

      await markStatus("sent_with_whatsapp");
    } catch (error) {
      // Prima questo errore faceva fallire l'azione e basta: la prenotazione
      // restava «in attesa» di un WhatsApp che non sarebbe mai partito, e
      // nessuno lo sapeva. Ora resta scritto, e lo staff riceve l'avviso.
      console.error("WhatsApp di conferma non inviato:", error);

      await record({
        status: "failed",
        detail: twilioErrorDetail(
          (error as { code?: unknown }).code,
          "Twilio non ha accettato il messaggio",
        ),
      });
      await markFailed();
    }

    // await client.messages.create({
    //   messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    //   // from: process.env.TWILIO_PHONE_SENDER_VIRTUAL ?? "",
    //   to: `whatsapp:${userPhoneNumber}`,
    //   // to: "+18777804236", // numero di test di Twilio
    //   body: `Ciao ${userFirstName}! La tua prenotazione presso ASD Padel Sport Melilli per il ${humanDate} è confermata. Codice: ${bookingCode}. Ti aspettiamo al centro — presentati 10 minuti prima. Per info rispondi a questo messaggio o chiama la segreteria. Buon divertimento!`,
    // });
  },
});
