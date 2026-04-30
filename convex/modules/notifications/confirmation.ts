"use node";

import { internalAction } from "@/convex/_generated/server";
import { getMessagingClient } from "@/convex/utils/notification_client";
import { v } from "convex/values";
import { format } from "date-fns";

export const sendConfirmationWithWhatsapp = internalAction({
  args: {
    userFirstName: v.string(),
    userPhoneNumber: v.string(),
    date: v.string(),
    bookingCode: v.string(),
  },
  handler: async (
    _ctx,
    { userFirstName, userPhoneNumber, date, bookingCode },
  ) => {
    const humanDate = format(new Date(date), "dd/MM/yyyy 'alle' HH:mm");

    const vars = {
      "1": userFirstName,
      "2": humanDate,
      "3": bookingCode,
    };

    if (!Object.values(vars).every(Boolean)) {
      throw new Error(`Variabili WhatsApp incomplete: ${JSON.stringify(vars)}`);
    }

    const client = getMessagingClient();
    await client.messages.create({
      from: `whatsapp:${process.env.TWILIO_PHONE_SENDER}`, // o numero business
      to: `whatsapp:${userPhoneNumber}`,
      contentSid: "HX59dcd979ad55c221765b52157430c98b", // ID template Twilio
      contentVariables: JSON.stringify({
        "1": userFirstName,
        "2": humanDate,
        "3": bookingCode,
      }),
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
