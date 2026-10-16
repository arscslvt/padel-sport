"use node";

import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { formatClubDateTime } from "../../utils/clubTime";
import { getMessagingClient } from "../../utils/notification_client";
import {
  type DeliveryEntry,
  fromTwilioStatus,
  twilioErrorDetail,
} from "../deliveries/lib";

/**
 * L'invito a chi è stato chiamato per nome a una partita, da chi ha prenotato
 * dall'area personale: un WhatsApp e una mail, che portano allo stesso posto.
 *
 * Il WhatsApp parte col template approvato su Twilio indicato da
 * `TWILIO_MATCH_INVITE_TEMPLATE_SID`, con quattro variabili in ordine: il
 * nome dell'invitato, chi lo invita, giorno e ora («19/10/2026 alle 10:00») e
 * l'id dell'invito. L'ultima è la coda dell'URL del pulsante
 * (`/invite/{{4}}`): porta dritto alla schermata di quell'invito, dove si
 * accetta o si rifiuta. La mail la spedisce il sito (api/invites/notify), con
 * lo stesso link.
 *
 * Ogni tentativo resta nel registro degli avvisi della prenotazione
 * (`bookingDeliveries`, tipo `invited`): lo staff vede dalla scheda chi è
 * stato invitato e se l'ha ricevuto. Se non parte niente l'invito resta
 * valido lo stesso, nell'area personale e nell'app.
 */
export const send = internalAction({
  args: { inviteId: v.id("matchInvites") },
  handler: async (ctx, { inviteId }) => {
    const data = await ctx.runQuery(
      internal.modules.notifications.matchInviteData.payload,
      { inviteId },
    );
    if (!data) return;

    const record = (
      channel: "email" | "whatsapp",
      entry: Omit<DeliveryEntry, "role" | "playerId" | "name">,
    ) =>
      ctx.runMutation(internal.modules.deliveries.record.default, {
        bookingId: data.bookingId,
        kind: "invited",
        channel,
        entries: [
          { role: "player", playerId: data.playerId, name: data.name, ...entry },
        ],
      });

    await sendWhatsapp();
    await sendMail();

    async function sendWhatsapp() {
      if (!data) return;

      if (!data.phone) {
        await record("whatsapp", {
          status: "skipped",
          detail: "Nessun numero di telefono",
        });
        return;
      }

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
        await record("whatsapp", {
          recipient: data.phone,
          status: "failed",
          detail: "Invio WhatsApp non configurato",
        });
        return;
      }

      // Come per la conferma: Twilio richiama a ogni passo del messaggio, e
      // la riga matura fino a «letto».
      const siteUrl = process.env.CONVEX_SITE_URL;

      try {
        const message = await getMessagingClient().messages.create({
          from: `whatsapp:${sender}`,
          to: `whatsapp:${data.phone}`,
          contentSid,
          contentVariables: JSON.stringify({
            "1": data.firstName,
            "2": data.inviterName,
            "3": formatClubDateTime(data.matchDate, " alle "),
            "4": inviteId,
          }),
          ...(siteUrl ? { statusCallback: `${siteUrl}/webhooks/twilio` } : {}),
        });

        await record("whatsapp", {
          recipient: data.phone,
          status: fromTwilioStatus(message.status) ?? "queued",
          providerId: message.sid,
        });
        await ctx.runMutation(
          internal.modules.notifications.matchInviteData.markSent,
          { inviteId },
        );
      } catch (error) {
        console.error("WhatsApp d'invito non inviato:", error);
        await record("whatsapp", {
          recipient: data.phone,
          status: "failed",
          detail: twilioErrorDetail(
            (error as { code?: unknown }).code,
            "Twilio non ha accettato il messaggio",
          ),
        });
      }
    }

    async function sendMail() {
      if (!data) return;

      const siteUrl = process.env.SITE_URL;
      const secret = process.env.BOOKING_WEBHOOK_SECRET;
      if (!siteUrl || !secret) {
        console.warn(
          "Mail d'invito non inviata: SITE_URL o BOOKING_WEBHOOK_SECRET mancanti sul deployment Convex.",
        );
        await record("email", {
          recipient: data.email,
          status: "failed",
          detail: "Invio delle mail non configurato",
        });
        return;
      }

      try {
        const response = await fetch(`${siteUrl}/api/invites/notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-booking-webhook-secret": secret,
          },
          body: JSON.stringify({
            inviteId,
            recipientName: data.name,
            email: data.email,
            clerkUserId: data.clerkUserId,
            inviterName: data.inviterName,
            start: data.matchDate,
            court: data.court,
            players: data.players,
          }),
        });

        const result = (await response.json().catch(() => null)) as {
          email?: string;
          id?: string;
          error?: string;
          skipped?: string;
        } | null;

        if (!result) {
          throw new Error(`${response.status}: risposta non valida`);
        }

        await record(
          "email",
          result.id
            ? { recipient: result.email, status: "queued", providerId: result.id }
            : result.skipped
              ? { recipient: result.email, status: "skipped", detail: result.skipped }
              : {
                  recipient: result.email,
                  status: "failed",
                  detail: result.error ?? "Resend non l'ha accettata",
                },
        );
      } catch (error) {
        console.error("Mail d'invito non inviata:", error);
        await record("email", {
          recipient: data.email,
          status: "failed",
          detail: "Il sito non ha spedito la mail",
        });
      }
    }
  },
});
