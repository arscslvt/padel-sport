import { v } from "convex/values";
import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Segna a chi è arrivata una comunicazione, un blocco di destinatari alla
 * volta.
 *
 * La chiama la route dopo ogni blocco accettato da Resend, non alla fine: se
 * l'invio si interrompe a metà, quel che è partito resta registrato e il
 * tentativo successivo riparte da chi manca davvero.
 *
 * Le consegne già note si saltano invece di duplicarle: un «invia di nuovo a
 * tutti» ripassa su gente che ha già la sua riga, e due righe per la stessa
 * persona non aggiungono niente a quel che sappiamo.
 */
export default mutation({
  args: {
    secret: v.string(),
    communicationId: v.id("eventCommunications"),
    documentId: v.string(),
    blockKey: v.string(),
    recipients: v.array(
      v.object({ rsvpId: v.id("eventRsvps"), email: v.string() }),
    ),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    const existing = await ctx.db
      .query("eventCommunicationDeliveries")
      .withIndex("by_document", (q) =>
        q.eq("documentId", args.documentId).eq("blockKey", args.blockKey),
      )
      .collect();

    const known = new Set(existing.map((row) => row.rsvpId));
    const now = Date.now();
    let written = 0;

    for (const recipient of args.recipients) {
      if (known.has(recipient.rsvpId)) continue;
      known.add(recipient.rsvpId);

      await ctx.db.insert("eventCommunicationDeliveries", {
        communicationId: args.communicationId,
        documentId: args.documentId,
        blockKey: args.blockKey,
        rsvpId: recipient.rsvpId,
        email: recipient.email,
        sentAt: now,
      });

      written++;
    }

    return { written };
  },
});
