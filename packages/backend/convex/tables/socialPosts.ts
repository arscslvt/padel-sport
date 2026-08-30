import { defineTable } from "convex/server";
import { v } from "convex/values";

import {
  posterSpec,
  socialApproval,
  socialChannel,
  socialFormat,
  socialPostKind,
  socialPostStatus,
} from "../modules/social/lib";

/**
 * Un contenuto social, dalla nascita alla pubblicazione.
 *
 * La riga è la fonte di verità, la locandina è una sua proiezione: non
 * esistono file da qualche parte, esiste una route che disegna questa riga.
 * Per lo stesso motivo il testo consegnato al modello resta scritto qui — è
 * l'unico modo di rispondere, fra sei mesi, alla domanda «ma questo post da
 * dove è uscito».
 *
 * Contenuti automatici e contenuti da approvare stanno insieme e condividono
 * la stessa macchina a stati: l'unica differenza è che i primi saltano
 * `pending_review`. Tenerli in due tabelle avrebbe voluto dire due archivi,
 * due elenchi e due punti in cui dimenticarsi un caso.
 */
const socialPosts = defineTable({
  kind: socialPostKind,
  format: socialFormat,
  channel: socialChannel,
  /** Derivato dal `kind` in `approvalFor`, mai passato dal chiamante. */
  approval: socialApproval,
  status: socialPostStatus,
  /**
   * Il fatto che ha generato la riga, in forma di chiave.
   *
   * Dipende solo da identificatori — mai dall'ora, mai dal contenuto — perché
   * è l'unica difesa contro il doppione quando un'azione viene ritentata. La
   * compone `triggerKeyFor`.
   */
  triggerKey: v.string(),
  /**
   * L'identificativo di ciò che ha generato la riga: la partita, la richiesta,
   * il documento dell'evento.
   *
   * Ricavarlo dalla `triggerKey` sarebbe possibile — è dentro la stringa — ma
   * legherebbe la lettura dei fatti al formato di una chiave nata per un altro
   * scopo. Un campo costa meno di quel vincolo.
   */
  subjectId: v.optional(v.string()),

  /**
   * Il testo esatto consegnato al modello, già anonimizzato.
   *
   * È l'unico posto in cui si può verificare che una promessa sia stata
   * mantenuta: se un nome fosse mai finito dove non doveva, si legge qui. Va
   * scritto anche quando la composizione fallisce.
   */
  facts: v.optional(v.string()),
  caption: v.optional(v.string()),
  /**
   * Separati dalla didascalia, non accodati.
   *
   * Instagram li concatena in fondo e ne regge trenta; su Facebook sono un tic
   * estraneo e se ne mettono due o nessuno. Se il modello restituisse una
   * stringa sola, aggiungere un canale vorrebbe dire riscrivere il prompt.
   */
  hashtags: v.optional(v.array(v.string())),
  poster: v.optional(posterSpec),
  /** `_ref` dell'immagine Sanity scelta come sfondo, se ce n'è una. */
  backgroundAssetRef: v.optional(v.string()),
  /** Descrizione dell'immagine per chi non la vede. */
  altText: v.optional(v.string()),
  /**
   * Il lasciapassare della route pubblica che disegna la locandina.
   *
   * Gli `_id` di Convex non sono un segreto, e una bozza non ancora approvata
   * non è contenuto pubblico. Cambiare la bozza rigenera il token: l'indirizzo
   * vecchio muore, ed è ciò che permette di servire l'immagine come immutabile
   * pur potendola correggere.
   */
  posterToken: v.string(),
  /** L'indirizzo *dipinto* sulla locandina: le storie non reggono link veri. */
  linkUrl: v.optional(v.string()),
  /**
   * Da quale template è nata, quando ne viene da uno.
   *
   * Serve a chiudere il giro del primo giro: approvare il contenuto è ciò che
   * dichiara buono il template, e senza questo riferimento non si saprebbe quale.
   */
  templateId: v.optional(v.id("socialTemplates")),
  /**
   * I valori con cui riempire il template, per chi non li può rileggere.
   *
   * Serve solo agli eventi: quelli vivono su Sanity, e il promemoria si compone
   * due giorni prima dell'evento, quando il webhook che portava i dati è
   * passato da settimane. Tutti gli altri li ricalcolano dal database al
   * momento, che è meglio — un dato riletto è aggiornato, uno conservato è una
   * fotografia.
   *
   * Resta comunque fresca: se l'evento cambia, Sanity manda un altro webhook e
   * questa viene riscritta.
   */
  subjectValues: v.optional(v.string()),

  /** Da quando è pubblicabile. Per i promemoria, due giorni prima dell'evento. */
  scheduledAt: v.float64(),

  /**
   * Il contenitore aperto su Instagram, prima della pubblicazione vera.
   *
   * Vale 24 ore e si riusa: se il secondo passo fallisce per un intoppo di
   * rete, si ritenta con questo invece di aprirne un altro. È metà del flusso
   * resa idempotente gratis.
   */
  containerId: v.optional(v.string()),
  externalId: v.optional(v.string()),
  permalink: v.optional(v.string()),
  publishedAt: v.optional(v.float64()),
  /** Quando è scattato il lucchetto: serve a riconoscere i tentativi morti. */
  publishStartedAt: v.optional(v.float64()),
  attempts: v.float64(),
  error: v.optional(v.string()),

  /** Chi dello staff ha deciso, e quando. */
  reviewedBy: v.optional(v.string()),
  reviewedAt: v.optional(v.float64()),
  /** Cosa non andava, quando si chiede di rifare. */
  feedback: v.optional(v.string()),

  /** Tracciabilità e costo: quale modello, quale prompt, quanti token. */
  model: v.optional(v.string()),
  promptVersion: v.optional(v.string()),
  inputTokens: v.optional(v.float64()),
  outputTokens: v.optional(v.float64()),

  createdAt: v.float64(),
})
  /**
   * L'identità di una riga: cosa è successo, dove va, in che forma.
   *
   * Il formato fa parte della chiave e non è un di più. L'annuncio di un evento
   * nasce due volte dallo stesso fatto — un post che resta nel profilo e una
   * storia che raggiunge chi non scorre il feed — e senza questa terza colonna
   * la seconda riga sembrerebbe il doppione della prima.
   */
  .index("by_trigger", ["triggerKey", "channel", "format"])
  .index("by_status_scheduled", ["status", "scheduledAt"])
  /** Lo storico che entra nel prompt per non ripetersi. */
  .index("by_kind_created", ["kind", "createdAt"])
  .index("by_created", ["createdAt"]);

export default socialPosts;
