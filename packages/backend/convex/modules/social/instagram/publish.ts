import { v } from "convex/values";

import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { staffSocialUrl } from "../../../utils/staffLinks";
import {
  containerStatus,
  createContainer,
  type InstagramConfig,
  instagramUserId,
  mediaPermalink,
  publishContainer,
  seedToken,
} from "./client";

/**
 * Porta un contenuto su Instagram.
 *
 * Due passi, con un lucchetto davanti e un riscaldamento in mezzo. Il lucchetto
 * perché due tentativi in parallelo sulla stessa riga significano due post
 * identici sul profilo, e Instagram non permette di cancellarne uno.
 *
 * Il riscaldamento — una `GET` sulla nostra stessa locandina prima di dirla a
 * Meta — fa due cose in una: la rete di distribuzione ha già i byte quando Meta
 * arriva, e un errore di disegno fa fallire il post **prima** che esista a metà.
 * Scoprire che la locandina non si genera dopo aver aperto il contenitore
 * significherebbe lasciarne in giro uno mezzo fatto.
 */

/** Quanto aspettare che Meta finisca di scaricare l'immagine. */
const READY_ATTEMPTS = 10;
const READY_DELAY_MS = 3000;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default internalAction({
  args: { postId: v.id("socialPosts") },
  handler: async (ctx, { postId }) => {
    const userId = instagramUserId();

    // Nessun account configurato: no-op silenzioso, come il calendario senza
    // credenziali. Le righe restano in coda e usciranno quando ci sarà.
    if (!userId) return;

    const row = await ctx.runMutation(
      internal.modules.social.data.beginPublish,
      { postId },
    );

    // Il lucchetto non si è aperto: la riga non era pronta, o qualcun altro la
    // sta già pubblicando. In entrambi i casi non è affar nostro.
    if (!row) return;

    const fail = async (error: string, retry: boolean) => {
      await ctx.runMutation(internal.modules.social.data.failPublish, {
        postId,
        error,
        retry,
      });

      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.alert.default,
        {
          title: "Contenuto social non pubblicato",
          message: error,
          url: staffSocialUrl(postId),
          idempotencyKey: `social-publish-error-${postId}`,
        },
      );
    };

    try {
      const resolved = await ctx.runMutation(
        internal.modules.social.data.resolveToken,
        { channel: "instagram", seed: seedToken() ?? undefined },
      );

      const accessToken = resolved?.accessToken;

      if (!accessToken) {
        // Non si ritenta: senza gettone il prossimo tentativo fallirebbe
        // identico, e una riga che rimbalza in coda ogni ora è rumore.
        await fail(
          "Gettone di Instagram non configurato sul deployment Convex.",
          false,
        );
        return;
      }

      const config: InstagramConfig = { userId, accessToken };
      const site = process.env.SITE_URL ?? "https://asdpadelsport.com";
      const imageUrl = `${site}/api/social/poster/${postId}?token=${row.posterToken}`;

      const warm = await fetch(imageUrl).catch(() => null);

      if (!warm?.ok || !warm.headers.get("content-type")?.includes("image/")) {
        await fail(
          `La locandina non si genera (${warm?.status ?? "nessuna risposta"}): controlla che ${site} sia raggiungibile dall'esterno.`,
          true,
        );
        return;
      }

      /**
       * Il contenitore si riusa se c'è già.
       *
       * Vale ventiquattr'ore, e ritentare con lo stesso invece di aprirne un
       * altro rende idempotente metà del flusso senza costare niente.
       */
      let containerId = row.containerId;

      if (!containerId) {
        containerId = await createContainer(config, {
          imageUrl,
          caption: [row.caption ?? "", (row.hashtags ?? []).join(" ")]
            .filter(Boolean)
            .join("\n\n"),
          isStory: row.format === "story",
        });

        await ctx.runMutation(internal.modules.social.data.saveContainer, {
          postId,
          containerId,
        });
      }

      let ready = false;

      for (let attempt = 0; attempt < READY_ATTEMPTS; attempt++) {
        const status = await containerStatus(config, containerId);

        if (status.error) {
          // Un contenitore rifiutato da Meta non migliora ritentando lo stesso:
          // il problema è nell'immagine o nella didascalia.
          await fail(
            `Instagram ha rifiutato il contenuto: ${status.error}`,
            false,
          );
          return;
        }

        if (status.ready) {
          ready = true;
          break;
        }

        await wait(READY_DELAY_MS);
      }

      if (!ready) {
        await fail(
          "Instagram non ha finito di preparare il contenuto in tempo.",
          true,
        );
        return;
      }

      const mediaId = await publishContainer(config, containerId);
      const permalink = await mediaPermalink(config, mediaId).catch(
        () => undefined,
      );

      await ctx.runMutation(internal.modules.social.data.completePublish, {
        postId,
        externalId: mediaId,
        permalink,
      });
    } catch (error) {
      console.error("Pubblicazione su Instagram fallita:", error);
      await fail(
        error instanceof Error ? error.message : "Errore sconosciuto.",
        true,
      );
    }
  },
});
