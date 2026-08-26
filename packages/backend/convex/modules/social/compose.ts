import { v } from "convex/values";

import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { staffSocialUrl } from "../../utils/staffLinks";
import type { PosterSpec, SocialPostKind } from "./lib";

/**
 * Scrive il contenuto di una riga appena rivendicata.
 *
 * È un'azione e non una mutation perché qui, dalla fase successiva, si parla
 * con il modello: tutto il database passa quindi da `data.ts`, via `runQuery` e
 * `runMutation`.
 *
 * **Il testo di questa versione è provvisorio.** La struttura — controllo delle
 * impostazioni, raccolta dei fatti, stesura, chiusura della composizione,
 * instradamento — è quella definitiva; a cambiare sarà solo da dove esce la
 * stesura, che oggi è `provisionalDraft` e domani sarà una chiamata a Claude
 * con l'uscita vincolata a uno schema. Il resto del sistema si può montare e
 * collaudare adesso, senza chiave e senza aspettare.
 */

/** Sopratitolo per trigger: l'unica parte che sopravvivrà così com'è. */
const EYEBROW: Record<SocialPostKind, string> = {
  tournament_result: "Risultati",
  courts_tomorrow: "Domani in campo",
  tip: "Consigli",
  event_announce: "Nuovo evento",
  event_reminder: "Fra due giorni",
  open_match: "Cercasi giocatori",
  player_request: "Cercasi giocatori",
};

/**
 * Una bozza segnaposto, deterministica e riconoscibile.
 *
 * Deve *sembrare* incompleta a colpo d'occhio: se somigliasse a un testo
 * finito, prima o poi qualcuno la approverebbe per distrazione.
 */
function provisionalDraft(kind: SocialPostKind): {
  caption: string;
  poster: PosterSpec;
} {
  return {
    caption: `[bozza da comporre — ${kind}]`,
    poster: {
      eyebrow: EYEBROW[kind],
      headline: "Bozza da comporre",
      subhead: "Il testo arriverà dal modello.",
      accent: kind === "tip" ? "light" : "ink",
    },
  };
}

export default internalAction({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const row = await ctx.runQuery(internal.modules.social.data.forCompose, {
      postId,
    });

    if (!row || row.status !== "drafting") return;

    try {
      const settings = await ctx.runQuery(
        internal.modules.social.data.settings,
        {},
      );

      const draft = provisionalDraft(row.kind);

      const { status } = await ctx.runMutation(
        internal.modules.social.data.completeCompose,
        {
          postId,
          // I fatti restano scritti anche in questa versione: è il campo su cui
          // si verifica, riga per riga, che nessun nome sia mai arrivato al
          // modello. Vale la pena averlo popolato fin dall'inizio.
          facts: `trigger: ${row.kind}\nchiave: ${row.triggerKey}`,
          caption: draft.caption,
          hashtags: settings.baseHashtags,
          poster: draft.poster,
          linkUrl: "asdpadelsport.com/book",
        },
      );

      if (status === "queued") {
        await ctx.scheduler.runAfter(0, internal.modules.social.queue.default, {
          postId,
        });
        return;
      }

      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.alert.default,
        {
          title: "Bozza social da approvare",
          message: draft.poster.headline,
          url: staffSocialUrl(postId),
          idempotencyKey: `social-review-${postId}`,
        },
      );
    } catch (error) {
      console.error("Composizione del contenuto social fallita:", error);

      await ctx.runMutation(internal.modules.social.data.failCompose, {
        postId,
        error: error instanceof Error ? error.message : "Errore sconosciuto.",
      });

      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.alert.default,
        {
          title: "Contenuto social non composto",
          message: `Trigger ${row.kind}, chiave ${row.triggerKey}.`,
          url: staffSocialUrl(postId),
          idempotencyKey: `social-compose-error-${postId}`,
        },
      );
    }
  },
});
