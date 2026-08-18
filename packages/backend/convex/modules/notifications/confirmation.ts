"use node";

import { api, internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { getMessagingClient } from "../../utils/notification_client";
import { v } from "convex/values";
import { format } from "date-fns";

export const sendConfirmationWithWhatsapp = internalAction({
  args: {
    bookingId: v.id("bookings"),
  },
  handler: async (ctx, { bookingId }) => {
    const booking = await ctx.runQuery(api.bookings.get.getById, { bookingId });

    try {
      if (!booking) {
        throw new Error("Can't send WhatsApp confirmation: booking not found.");
      }
      if (!booking.code) {
        throw new Error(
          "Can't send WhatsApp confirmation: booking code not found.",
        );
      }
      // Le prenotazioni nate nell'app non raccolgono il recapito: senza, il
      // messaggio partirebbe verso `whatsapp:undefined` a ogni tentativo. La
      // conferma è comunque già andata via mail.
      if (!booking.phone) {
        throw new Error(
          "Can't send WhatsApp confirmation: booking has no phone number.",
        );
      }
    } catch (error) {
      console.error(error);
      return;
    }

    const humanDate = format(
      new Date(booking.bookingDate),
      "dd/MM/yyyy 'alle' HH:mm",
    );

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

    if (!Object.values(vars).every(Boolean)) {
      throw new Error(
        `Incomplete variables for WhatsApp message: ${JSON.stringify(vars)}`,
      );
    }

    const client = getMessagingClient();
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_SENDER}`, // o numero business
      to: `whatsapp:${booking.phone}`, // numero del cliente
      // Sostituibile senza rilascio: cambiando il template su Twilio basta
      // aggiornare la variabile d'ambiente.
      contentSid:
        process.env.TWILIO_BOOKING_TEMPLATE_SID ??
        "HX59dcd979ad55c221765b52157430c98b",
      contentVariables: JSON.stringify(vars),
    });

    await ctx.runMutation(internal.bookings.update.notificationStatus, {
      bookingId,
      newStatus: "sent_with_whatsapp",
    });

    // await client.messages.create({
    //   messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID,
    //   // from: process.env.TWILIO_PHONE_SENDER_VIRTUAL ?? "",
    //   to: `whatsapp:${userPhoneNumber}`,
    //   // to: "+18777804236", // numero di test di Twilio
    //   body: `Ciao ${userFirstName}! La tua prenotazione presso ASD Padel Sport Melilli per il ${humanDate} è confermata. Codice: ${bookingCode}. Ti aspettiamo al centro — presentati 10 minuti prima. Per info rispondi a questo messaggio o chiama la segreteria. Buon divertimento!`,
    // });
  },
});
