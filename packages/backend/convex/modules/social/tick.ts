import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { staffSocialUrl } from "../../utils/staffLinks";

/**
 * Il battito del sistema social: una volta all'ora.
 *
 * Un cron solo e non tre, benché i lavori siano diversi, perché i cron di
 * Convex vanno in UTC: una storia «i campi liberi domani» fissata alle 19:00
 * uscirebbe alle 21:00 d'estate e alle 20:00 d'inverno. Un battito orario che
 * chiede l'ora al club — `clubMoment`, che l'ora legale la conosce — e decide
 * lui cosa è dovuto, non ha quel problema. I trigger a orario si agganciano
 * qui nella fase successiva.
 *
 * Nel frattempo fa il mestiere meno nobile e più necessario: rimettere in riga
 * ciò che si è incagliato. Il percorso felice non passa di qui — chi approva o
 * chi finisce di comporre accoda subito la pubblicazione, come fanno le altre
 * quattordici scritture di questo backend.
 */
export default internalAction({
  handler: async (ctx) => {
    const work = await ctx.runQuery(internal.modules.social.data.pending, {});

    for (const postId of work.due) {
      await ctx.scheduler.runAfter(0, internal.modules.social.queue.default, {
        postId,
      });
    }

    // Una composizione appesa non ha detto niente a nessuno: si archivia e
    // basta, senza svegliare la struttura per una bozza mai nata.
    for (const postId of work.drafting) {
      await ctx.runMutation(internal.modules.social.data.abandon, {
        postId,
        status: "failed",
        error: "Composizione interrotta: nessuna risposta entro dieci minuti.",
      });
    }

    // Una pubblicazione appesa è un'altra faccenda. La chiamata può essere
    // arrivata a destinazione con la risposta persa per strada: ritentare
    // rischia il doppione, lasciar perdere rischia il buco. Decide una persona,
    // che ha modo di aprire il profilo e guardare.
    for (const postId of work.publishing) {
      await ctx.runMutation(internal.modules.social.data.abandon, {
        postId,
        status: "needs_attention",
        error:
          "Pubblicazione di esito ignoto: controlla il profilo prima di ritentare.",
      });

      await ctx.scheduler.runAfter(
        0,
        internal.modules.notifications.alert.default,
        {
          title: "Contenuto social da controllare",
          message:
            "Una pubblicazione è rimasta a metà: guarda su Instagram se è uscita prima di ritentare.",
          url: staffSocialUrl(postId),
          idempotencyKey: `social-stale-${postId}`,
        },
      );
    }
  },
});
