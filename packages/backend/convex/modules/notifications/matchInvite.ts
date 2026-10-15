"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { formatClubDateTime } from "../../utils/clubTime";
import { getMessagingClient } from "../../utils/notification_client";

/**
 * Il WhatsApp che avvisa chi è stato invitato per nome a una partita.
 *
 * Parte col template approvato su Twilio indicato da
 * `TWILIO_MATCH_INVITE_TEMPLATE_SID`, con tre variabili in ordine: il nome
 * dell'invitato, chi lo invita, giorno e ora («19/10/2026 alle 10:00»). Il
 * pulsante del template porta all'area personale (`/me/prenotazioni`), dove
 * l'invito si accetta o si rifiuta.
 *
 * Senza template, senza Twilio o senza telefono non parte niente, e va bene
 * lo stesso: l'invito resta nell'area personale e nell'app.
 */
export const send = internalAction({
  args: { inviteId: v.id("matchInvites") },
  handler: async (ctx, { inviteId }) => {
    const data = await ctx.runQuery(
      internal.modules.notifications.matchInviteData.payload,
      { inviteId },
    );
    if (!data) return;

    const sender = process.env.TWILIO_PHONE_SENDER;
    const contentSid = process.env.TWILIO_MATCH_INVITE_TEMPLATE_SID;
    if (
      !sender ||
      !contentSid ||
      !process.env.TWILIO_SID ||
      !process.env.TWILIO_AUTH
    ) {
      console.warn(
        "WhatsApp d'invito non inviato: TWILIO_MATCH_INVITE_TEMPLATE_SID, TWILIO_SID, TWILIO_AUTH o TWILIO_PHONE_SENDER mancanti.",
      );
      return;
    }

    try {
      await getMessagingClient().messages.create({
        from: `whatsapp:${sender}`,
        to: `whatsapp:${data.phone}`,
        contentSid,
        contentVariables: JSON.stringify({
          "1": data.firstName,
          "2": data.inviterName,
          "3": formatClubDateTime(data.matchDate, " alle "),
        }),
      });

      await ctx.runMutation(
        internal.modules.notifications.matchInviteData.markSent,
        { inviteId },
      );
    } catch (error) {
      // L'invito resta valido: lo si vede comunque dall'area personale.
      console.error("WhatsApp d'invito non inviato:", error);
    }
  },
});
