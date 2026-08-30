import { v } from "convex/values";

import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { applyTemplate, claimRow, markSkipped, pickTemplate } from "./data";
import { formatsFor, triggerKeyFor } from "./lib";
import { situationOf, valuesOf } from "./situations";

/**
 * Un evento è stato pubblicato su Sanity.
 *
 * Gli eventi del sito vivono nel CMS, non qui: non c'è una mutation Convex a
 * cui agganciarsi, e l'unico momento in cui si sa che ce n'è uno nuovo è quando
 * Sanity lo racconta. Il webhook atterra sul sito, che ne verifica la firma, e
 * da lì arriva a questa mutation con il segreto condiviso — le stesse due
 * serrature della dashboard, con la firma di Sanity al posto di Clerk.
 *
 * I fatti arrivano nel corpo della richiesta invece di essere letti da qui: dare
 * a Convex un percorso di lettura verso il CMS solo per rileggere ciò che il
 * webhook ha già in mano sarebbe una dipendenza in più per niente. È anche il
 * motivo per cui questa mutation non passa da `factsInputFor`.
 *
 * Due righe per ogni evento, e non una: l'annuncio, che resta nel profilo, e il
 * promemoria di due giorni prima, che si compone da sé quando arriva il momento.
 */
export default mutation({
  args: {
    secret: v.string(),
    documentId: v.string(),
    title: v.string(),
    excerpt: v.optional(v.string()),
    /** In ISO, come lo scrive Sanity. */
    startsAt: v.string(),
    endsAt: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    /** Il documento è stato cancellato o spubblicato. */
    deleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    const startsAt = Date.parse(args.startsAt);
    if (Number.isNaN(startsAt)) throw new Error("Data di inizio non valida.");

    const announceKey = triggerKeyFor({
      kind: "event_announce",
      documentId: args.documentId,
    });
    const reminderKey = triggerKeyFor({
      kind: "event_reminder",
      documentId: args.documentId,
    });

    // Evento tolto dal sito: quello che non è ancora uscito si ferma. Quello
    // già pubblicato no — su Instagram resta, e fingere il contrario sarebbe
    // peggio che dirlo.
    if (args.deleted) {
      const rows = await ctx.db
        .query("socialPosts")
        .withIndex("by_created")
        .order("desc")
        .take(200);

      for (const row of rows) {
        if (row.triggerKey !== announceKey && row.triggerKey !== reminderKey) {
          continue;
        }
        if (row.status === "pending_review" || row.status === "queued") {
          await ctx.db.patch(row._id, {
            status: "rejected",
            error: "L'evento è stato tolto dal sito.",
          });
        }
      }

      return { cancelled: true };
    }

    const facts = {
      kind: "event_announce" as const,
      title: args.title,
      excerpt: args.excerpt ?? "",
      startsAt,
      endsAt: args.endsAt ? Date.parse(args.endsAt) : undefined,
      tags: args.tags ?? [],
    };

    const created: string[] = [];

    /**
     * Il promemoria nasce adesso ma si racconta fra due giorni dall'evento.
     *
     * Non si compone in anticipo: se l'evento cambia data o titolo nel
     * frattempo, il promemoria racconterebbe la versione vecchia. Nasce
     * rivendicato — così la chiave è occupata e nessun webhook ripetuto ne crea
     * un altro — e resta in composizione finché il cron non lo raccoglie.
     */
    const REMINDER_LEAD_MS = 2 * 24 * 60 * 60 * 1000;

    for (const kind of ["event_announce", "event_reminder"] as const) {
      const scheduledAt =
        kind === "event_reminder" ? startsAt - REMINDER_LEAD_MS : Date.now();

      // Un promemoria per un evento che è già fra meno di due giorni non ha
      // senso: l'annuncio lo copre da solo.
      if (kind === "event_reminder" && scheduledAt <= Date.now()) continue;

      for (const format of formatsFor(kind)) {
        const postId = await claimRow(ctx, {
          kind,
          format,
          channel: "instagram",
          triggerKey: kind === "event_announce" ? announceKey : reminderKey,
          subjectId: args.documentId,
          scheduledAt,
        });

        if (!postId) continue;
        created.push(postId);

        // I valori restano scritti sulla riga: gli eventi vivono su Sanity, e
        // da Convex non si rileggono. Servono al promemoria, che si comporrà
        // fra settimane, e vengono riscritti se l'evento cambia.
        await ctx.db.patch(postId, {
          subjectValues: JSON.stringify(valuesOf(facts)),
        });

        // Il promemoria aspetta il suo turno: lo sveglia il battito orario.
        if (kind === "event_reminder") continue;

        const situation = situationOf(facts);
        const template = situation
          ? await pickTemplate(ctx, kind, situation, format)
          : null;

        if (!template) {
          await markSkipped(
            ctx,
            postId,
            `Nessuno template approvato per «${kind}»: generali da /dashboard/social/template.`,
          );
          continue;
        }

        const row = await ctx.db.get(postId);
        if (!row) continue;

        await applyTemplate(
          ctx,
          row,
          template,
          valuesOf(facts),
          `evento «${args.title}»`,
        );
      }
    }

    return { created };
  },
});
