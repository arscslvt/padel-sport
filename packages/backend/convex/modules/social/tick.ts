import { internal } from "../../_generated/api";
import { internalAction } from "../../_generated/server";
import { clubDay } from "../../utils/clubTime";
import { staffSocialUrl } from "../../utils/staffLinks";
import { clubMoment } from "../settings/lib";
import { triggerKeyFor } from "./lib";

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
    const now = Date.now();
    const hour = Math.floor(clubMoment(now).minutes / 60);

    /**
     * La storia dei campi liberi di domani, alle diciannove.
     *
     * L'ora è quella del club e non quella del server: fissata in UTC
     * slitterebbe di un'ora fra estate e inverno, e una storia che dice
     * «domani» pubblicata alle venti di sera non è la stessa cosa che alle
     * diciannove. La chiave contiene il giorno, quindi anche se il battito
     * passasse due volte nella stessa ora ne uscirebbe una sola.
     */
    if (hour === 19) {
      const tomorrow = clubDay(now + 24 * 60 * 60 * 1000);

      await ctx.runMutation(internal.modules.social.enqueue.default, {
        kind: "courts_tomorrow",
        triggerKey: triggerKeyFor({ kind: "courts_tomorrow", day: tomorrow }),
      });
    }

    /**
     * Il rinnovo del gettone, una volta al giorno.
     *
     * Alle quattro del mattino: se qualcosa va storto, l'avviso arriva prima
     * che la struttura apra, invece che nel mezzo di una giornata di torneo.
     */
    if (hour === 4) {
      await ctx.scheduler.runAfter(
        0,
        internal.modules.social.instagram.refresh.default,
        {},
      );
    }

    const work = await ctx.runQuery(internal.modules.social.data.pending, {});

    // Chi aspettava il proprio turno: il promemoria di un evento che ora è
    // fra due giorni. Si riempie adesso, con i valori conservati sulla riga.
    for (const postId of work.toRender) {
      const result = await ctx.runMutation(
        internal.modules.social.data.renderParked,
        { postId },
      );

      if (result?.status === "queued") {
        await ctx.scheduler.runAfter(0, internal.modules.social.queue.default, {
          postId,
        });
      }
    }

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
