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
    } catch (error) {
      console.error(error);
      return;
    }

    const humanDate = format(
      new Date(booking.bookingDate),
      "dd/MM/yyyy 'alle' HH:mm",
    );

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
      contentSid: "HX59dcd979ad55c221765b52157430c98b", // ID template Twilio
      contentVariables: JSON.stringify({
        "1": booking.bookedBy,
        "2": humanDate,
        "3": booking.code,
      }),
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
