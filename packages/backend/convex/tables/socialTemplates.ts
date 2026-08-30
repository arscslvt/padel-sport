import { defineTable } from "convex/server";
import { v } from "convex/values";

import {
  posterSpec,
  socialFormat,
  socialPostKind,
} from "../modules/social/lib";

/**
 * I template: le frasi con i buchi da cui nascono i contenuti ricorrenti.
 *
 * È il pezzo che cambia la natura del sistema. Un risultato di torneo è la
 * stessa frase ogni volta con dentro numeri diversi, e farla riscrivere da capo
 * a ogni partita significava pagare un modello per reinventare una cosa che non
 * cambia — oltre che mandargli, ogni volta, i nomi dei giocatori.
 *
 * Da qui in poi il modello lavora **una volta sola**, su valori d'esempio
 * inventati, e ciò che scrive viene letto e approvato da una persona prima di
 * entrare in circolo. Al momento di pubblicare non c'è nessuna chiamata di
 * rete: c'è una sostituzione di testo dentro Convex. Che è anche il motivo per
 * cui un guasto del fornitore non può più impedire a un risultato di uscire.
 */
const socialTemplates = defineTable({
  kind: socialPostKind,
  /**
   * A quale situazione serve: «finale», «combattuta», «manca-uno».
   *
   * I valori possibili stanno in `SITUATIONS`, dentro il codice, e non qui:
   * la scelta di quale template usare dev'essere una ricerca, non la valutazione
   * di una condizione salvata accanto a ciascuno.
   */
  situation: v.string(),
  /**
   * In quali formati sa uscire.
   *
   * Un elenco e non un valore solo: l'annuncio di un evento nasce come post e
   * come storia dallo stesso fatto, e con un formato per template servivano due
   * copie della stessa frase — da correggere due volte, approvare due volte, e
   * da tenere allineate a mano.
   *
   * Il contenuto regge entrambe le tele: la locandina si adatta, e la
   * didascalia si scrive comunque anche per le storie, dove Instagram non la
   * mostra ma un altro canale la userà.
   */
  formats: v.optional(v.array(socialFormat)),
  /**
   * Il campo che `formats` ha sostituito.
   *
   * Resta solo perché i template salvati prima continuino a funzionare: chi
   * legge ricava l'elenco da qui quando `formats` manca.
   *
   * @deprecated
   */
  format: v.optional(socialFormat),

  /** Gli stessi campi di un contenuto, ma con i buchi ancora da riempire. */
  caption: v.string(),
  hashtags: v.array(v.string()),
  poster: posterSpec,
  /**
   * La fotografia di sfondo, scelta una volta per tutte.
   *
   * Sta sul template e non si decide al momento di pubblicare, ed è ciò che
   * permette al riempimento di essere una mutation invece di un'azione: niente
   * rete, niente attesa, niente che possa fallire mentre un risultato aspetta
   * di uscire.
   */
  backgroundAssetRef: v.optional(v.string()),
  altText: v.optional(v.string()),

  status: v.union(
    /** Scritto dal modello, aspetta che qualcuno lo legga. */
    v.literal("pending_review"),
    v.literal("approved"),
    v.literal("rejected"),
    /** Sostituito da una versione migliore: resta per lo storico. */
    v.literal("retired"),
  ),

  /**
   * Quante volte è stato usato.
   *
   * Serve a due cose. La rotazione, perché si sceglie sempre il meno usato e
   * così le varianti girano davvero invece di pescare sempre la stessa. E la
   * regola del primo giro: finché è a zero, il contenuto che ne esce passa
   * comunque dalla dashboard — è lì, con i buchi riempiti di dati veri, che si
   * vedono gli errori che sul template vuoto non si notano.
   */
  usageCount: v.float64(),
  lastUsedAt: v.optional(v.float64()),

  reviewedBy: v.optional(v.string()),
  reviewedAt: v.optional(v.float64()),
  feedback: v.optional(v.string()),

  model: v.optional(v.string()),
  promptVersion: v.optional(v.string()),

  createdAt: v.float64(),
})
  /**
   * La ricerca del momento della pubblicazione: cosa è successo, e come si dice.
   *
   * Il formato non è più nell'indice perché ora è un elenco, e gli elenchi non
   * si indicizzano così. Si filtra in memoria: per una situazione ci sono una
   * manciata di template, e leggerli tutti costa meno che tenere un indice per
   * ogni combinazione.
   */
  .index("by_slot", ["kind", "situation", "status"])
  .index("by_status_created", ["status", "createdAt"]);

export default socialTemplates;
