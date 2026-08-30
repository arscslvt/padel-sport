import { defineTable } from "convex/server";
import { v } from "convex/values";

import { socialChannel } from "../modules/social/lib";

/**
 * Il gettone d'accesso a Instagram, e la sua scadenza.
 *
 * Sta in tabella e non solo fra le variabili d'ambiente per un motivo tecnico
 * preciso: i gettoni di Instagram durano sessanta giorni e non si rinnovano da
 * soli, e un'azione Convex non può riscrivere le proprie variabili d'ambiente.
 * Il rinnovo automatico deve poter atterrare da qualche parte, e questa è
 * l'unica che c'è.
 *
 * `INSTAGRAM_ACCESS_TOKEN` resta il seme: al primo avvio, se qui non c'è
 * niente, si copia da lì. Da quel momento comanda la tabella.
 *
 * Da dire ad alta voce: così il gettone finisce in un documento, leggibile da
 * chi ha accesso al deployment. È lo stesso confine di fiducia delle variabili
 * d'ambiente — entrambe vivono nel deployment — quindi non è un peggioramento,
 * ma non deve essere una sorpresa per nessuno.
 */
const socialCredentials = defineTable({
  channel: socialChannel,
  accessToken: v.string(),
  /**
   * Il seme da cui questa riga è nata, cioè il valore che aveva
   * `INSTAGRAM_ACCESS_TOKEN` quando è stata creata.
   *
   * Serve a distinguere due situazioni che altrimenti si somigliano: un gettone
   * rinnovato dal sistema — che è giusto abbia la precedenza sulla variabile,
   * ferma al valore iniziale — e un gettone che qualcuno ha **sostituito a
   * mano** perché quello vecchio era morto. Nel secondo caso la variabile è
   * cambiata, e deve vincere lei.
   *
   * Senza questo confronto la reazione naturale a un gettone revocato —
   * impostare la variabile — non avrebbe alcun effetto, e non lo direbbe
   * nessuno.
   */
  seedFingerprint: v.optional(v.string()),
  /** Quando scade, secondo quanto ha risposto Meta all'ultimo rinnovo. */
  expiresAt: v.optional(v.float64()),
  refreshedAt: v.optional(v.float64()),
  /**
   * Quanti rinnovi di fila sono andati storti.
   *
   * Non serve a decidere se ritentare — si ritenta comunque, ogni giorno, fino
   * alla scadenza — ma a distinguere un intoppo di rete da un gettone ormai
   * morto quando qualcuno viene a chiedersi perché non esce più niente.
   */
  refreshFailures: v.float64(),
  updatedAt: v.float64(),
}).index("by_channel", ["channel"]);

export default socialCredentials;
