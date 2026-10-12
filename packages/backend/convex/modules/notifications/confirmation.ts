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
 * Il WhatsApp di conferma, col template approvato su Twilio.
 *
 * Ogni tentativo lascia una riga in `bookingDeliveries`, anche quando non
 * parte: chi guarda la scheda deve poter distinguere «non c'era il numero» da
 * «Twilio l'ha rifiutato» da «consegnato». Dopo l'invio la riga matura da sola
 * con lo `statusCallback` (http.ts), fino a «letto».
 */
export const sendConfirmationWithWhatsapp = internalAction({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.runQuery(api.bookings.get.getById, { bookingId });

    const record = (entry: DeliveryEntry) =>
      ctx.runMutation(internal.modules.deliveries.record.default, {
        bookingId,
        kind: "accepted",
        channel: "whatsapp",
        entries: [entry],
      });

    const markFailed = () =>
      ctx.runMutation(internal.bookings.update.notificationStatus, {
        bookingId,
        newStatus: "failed_to_send_whatsapp",
      });

    if (!booking.code) {
      console.error("WhatsApp di conferma non inviato: prenotazione senza codice.");
      await record({
        role: "booker",
        recipient: booking.phone,
        status: "failed",
        detail: "Prenotazione senza codice",
      });
      await markFailed();
      return;
    }

    // Le prenotazioni nate nell'app non raccolgono il recapito: senza, il
    // messaggio partirebbe verso `whatsapp:undefined` a ogni tentativo. La
    // conferma è comunque già andata via mail.
    if (!booking.phone) {
      await record({
        role: "booker",
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
        role: "booker",
        recipient: booking.phone,
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
      "1": booking.bookedBy,
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
        to: `whatsapp:${booking.phone}`, // numero del cliente
        // Sostituibile senza rilascio: cambiando il template su Twilio basta
        // aggiornare la variabile d'ambiente.
        contentSid:
          process.env.TWILIO_BOOKING_TEMPLATE_SID ??
          "HX59dcd979ad55c221765b52157430c98b",
        contentVariables: JSON.stringify(vars),
        ...(siteUrl ? { statusCallback: `${siteUrl}/webhooks/twilio` } : {}),
      });

      await record({
        role: "booker",
        recipient: booking.phone,
        status: fromTwilioStatus(message.status) ?? "queued",
        providerId: message.sid,
      });

      await ctx.runMutation(internal.bookings.update.notificationStatus, {
        bookingId,
        newStatus: "sent_with_whatsapp",
      });
    } catch (error) {
      // Prima questo errore faceva fallire l'azione e basta: la prenotazione
      // restava «in attesa» di un WhatsApp che non sarebbe mai partito, e
      // nessuno lo sapeva. Ora resta scritto, e lo staff riceve l'avviso.
      console.error("WhatsApp di conferma non inviato:", error);

      await record({
        role: "booker",
        recipient: booking.phone,
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
