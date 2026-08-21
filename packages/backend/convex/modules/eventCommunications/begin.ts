import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Dopo quanto un invio «in corso» si considera morto.
 *
 * Se la route muore a metà — il processo cade, Vercel tronca la richiesta — la
 * riga resta a `sending` e senza questa soglia bloccherebbe per sempre ogni
 * tentativo successivo. Dieci minuti sono molto più di quanto serva a mandare
 * qualche centinaio di mail, quindi una riga più vecchia di così non sta
 * lavorando: è rimasta indietro.
 */
const STALE_AFTER_MS = 10 * 60 * 1000;

/**
 * Prende il lucchetto prima di mandare una comunicazione.
 *
 * È questo il punto per cui lo stato degli invii vive su Convex: la mutation è
 * transazionale, quindi due richieste simultanee sulla stessa comunicazione
 * non possono passare entrambe. Chi arriva secondo trova la riga e si ferma.
 *
 * Chiamata dalla route dello staff, che ha già verificato la sessione Clerk:
 * qui il segreto condiviso è la seconda serratura.
 */
export default mutation({
  args: {
    secret: v.string(),
    documentId: v.string(),
    eventId: v.string(),
    blockKey: v.string(),
    eventTitle: v.string(),
    subject: v.string(),
    recipients: v.float64(),
    sentBy: v.string(),
    /** Reinvio deliberato: la dashboard lo passa solo dopo una seconda conferma */
    allowResend: v.optional(v.boolean()),
    /**
     * `pending` manda solo a chi non l'ha ancora ricevuta: non è un reinvio,
     * è la stessa comunicazione che raggiunge chi si è iscritto dopo. Per
     * questo non chiede la conferma di «invia di nuovo».
     */
    audience: v.optional(v.union(v.literal("all"), v.literal("pending"))),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    if (!Number.isInteger(args.recipients) || args.recipients < 1) {
      throw new ConvexError({
        code: "no_recipients",
        message: "Non c'è nessuno a cui mandare questa comunicazione.",
      });
    }

    const previous = await ctx.db
      .query("eventCommunications")
      .withIndex("by_document", (q) =>
        q.eq("documentId", args.documentId).eq("blockKey", args.blockKey),
      )
      .collect();

    const now = Date.now();

    // Un invio davvero in corso blocca sempre, anche il reinvio deliberato:
    // «invia di nuovo» vuol dire una seconda volta, non due in parallelo.
    const running = previous.find(
      (row) =>
        row.status === "sending" && now - row.startedAt < STALE_AFTER_MS,
    );

    if (running) {
      throw new ConvexError({
        code: "in_progress",
        message: "Questa comunicazione è già in fase di invio.",
      });
    }

    const audience = args.audience ?? "all";
    const sent = previous.find((row) => row.status === "sent");

    // Il blocco vale per chi rimanda la mail a tutti. Chi sta raggiungendo i
    // nuovi iscritti non sta ripetendo niente a nessuno: nessuna conferma.
    if (sent && audience === "all" && !args.allowResend) {
      throw new ConvexError({
        code: "already_sent",
        message: "Questa comunicazione è già stata inviata a questi iscritti.",
      });
    }

    const id = await ctx.db.insert("eventCommunications", {
      documentId: args.documentId,
      eventId: args.eventId,
      blockKey: args.blockKey,
      eventTitle: args.eventTitle,
      subject: args.subject,
      status: "sending",
      recipients: args.recipients,
      audience,
      // Da qui in avanti ogni invio lascia le sue consegne riga per riga: è il
      // segno che distingue questa comunicazione da quelle partite prima.
      tracked: true,
      delivered: 0,
      failed: 0,
      sentBy: args.sentBy,
      startedAt: now,
    });

    return { id, resent: Boolean(sent) && audience === "all" };
  },
});
