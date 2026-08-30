import { internal } from "../../../_generated/api";
import { internalAction } from "../../../_generated/server";
import { clubDay } from "../../../utils/clubTime";
import { STAFF_SETTINGS_URL } from "../../../utils/staffLinks";
import { instagramUserId, refreshToken, seedToken } from "./client";

/**
 * Rinnova il gettone di Instagram prima che scada.
 *
 * I gettoni lunghi durano sessanta giorni e **non si rinnovano da soli**: senza
 * questo, il sistema smetterebbe di pubblicare due mesi dopo l'installazione, e
 * lo si scoprirebbe dai post che non escono. È il guasto più prevedibile di
 * tutto l'impianto, e per questo il più imbarazzante da subire.
 *
 * Si rinnova con venti giorni di anticipo, non all'ultimo: se qualcosa va
 * storto restano tre settimane di tentativi quotidiani prima che diventi un
 * problema vero.
 */

/** Da quanto vicino alla scadenza vale la pena rinnovare. */
const RENEW_WITHIN_MS = 20 * 24 * 60 * 60 * 1000;

/** Meta rifiuta di rinnovare un gettone più giovane di un giorno. */
const MIN_AGE_MS = 25 * 60 * 60 * 1000;

export default internalAction({
  handler: async (ctx) => {
    // Nessun account configurato: non c'è niente da rinnovare.
    if (!instagramUserId()) return;

    const stored = await ctx.runMutation(
      internal.modules.social.data.resolveToken,
      { channel: "instagram", seed: seedToken() ?? undefined },
    );

    const accessToken = stored?.accessToken;
    if (!accessToken) return;

    const now = Date.now();

    // Appena installato: Meta rifiuterebbe, e non è un guasto da segnalare.
    if (stored?.refreshedAt && now - stored.refreshedAt < MIN_AGE_MS) return;

    // Ancora lontano dalla scadenza. Senza `expiresAt` — il seme messo a mano —
    // si prova comunque: è l'unico modo di scoprire quanto vale.
    if (stored?.expiresAt && stored.expiresAt - now > RENEW_WITHIN_MS) return;

    try {
      const renewed = await refreshToken(accessToken);

      await ctx.runMutation(internal.modules.social.data.saveCredentials, {
        channel: "instagram",
        accessToken: renewed.accessToken,
        expiresAt: renewed.expiresAt,
      });
    } catch (error) {
      console.error("Rinnovo del gettone Instagram fallito:", error);

      await ctx.runMutation(internal.modules.social.data.recordRefreshFailure, {
        channel: "instagram",
      });

      /**
       * La sveglia suona ogni giorno finché qualcuno non interviene.
       *
       * La chiave contiene la data proprio per questo: con una chiave fissa
       * Hark la considererebbe un doppione e la silenzierebbe dal secondo
       * giorno in poi, che è l'opposto di quello che serve per una cosa
       * destinata a rompere tutto.
       */
      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.alert.default,
        {
          title: "Gettone Instagram da rinnovare",
          message:
            "Il rinnovo automatico non è riuscito. Se non si risolve, fra qualche settimana i contenuti smetteranno di uscire.",
          url: STAFF_SETTINGS_URL,
          idempotencyKey: `social-token-${clubDay(now)}`,
        },
      );
    }
  },
});
