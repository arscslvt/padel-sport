import { v } from "convex/values";
import { query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Gli invii già fatti per un insieme di comunicazioni, per lo storico in
 * dashboard.
 *
 * Prende una lista di `documentId` e non uno solo perché la pagina li mostra
 * tutti insieme: una query per riga sarebbe una chiamata per card.
 *
 * Protetta dal segreto come `eventRsvps/list`: non ci sono nomi né indirizzi
 * qui dentro, ma sapere quante comunicazioni ha mandato il club e a quante
 * persone non è affare di chi passa dall'URL del deployment.
 */
export default query({
  args: {
    secret: v.string(),
    documentIds: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    const groups = await Promise.all(
      args.documentIds.map((documentId) =>
        ctx.db
          .query("eventCommunications")
          .withIndex("by_document", (q) => q.eq("documentId", documentId))
          .collect(),
      ),
    );

    return groups
      .flat()
      .sort((a, b) => b.startedAt - a.startedAt)
      .map((row) => ({
        id: row._id,
        documentId: row.documentId,
        eventId: row.eventId,
        blockKey: row.blockKey,
        subject: row.subject,
        status: row.status,
        recipients: row.recipients,
        delivered: row.delivered,
        failed: row.failed,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
        error: row.error,
      }));
  },
});
