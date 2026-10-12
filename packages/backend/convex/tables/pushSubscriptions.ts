import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Un dispositivo dello staff che riceve le notifiche push del gestionale.
 *
 * È la `PushSubscription` del browser, così come la consegna il Push API:
 * l'indirizzo del servizio push (Apple, Google, Mozilla) e le due chiavi con
 * cui cifrare il messaggio. Nessuna di queste è una password — per scrivere a
 * quell'indirizzo serve anche la chiave VAPID privata, che sta solo sul
 * deployment — ma insieme dicono «questo telefono», e non escono dalle query
 * riservate allo staff.
 *
 * Un telefono, una riga: l'`endpoint` è unico per installazione e browser. Se
 * un altro membro dello staff accede dallo stesso telefono, la riga passa a
 * lui invece di raddoppiare.
 *
 * Le righe si puliscono da sole: un 404 o un 410 dal servizio push vuol dire
 * che l'abbonamento non esiste più (app disinstallata, permesso revocato), e
 * la riga si cancella al primo invio che lo scopre (modules/push/send.ts).
 */
const pushSubscriptions = defineTable({
  endpoint: v.string(),
  p256dh: v.string(),
  auth: v.string(),
  /** `userId` Clerk di chi l'ha attivato: ogni dispositivo ha un nome sopra */
  userId: v.string(),
  /** Copia del nome del momento, per riconoscere i dispositivi a colpo d'occhio */
  userName: v.optional(v.string()),
  /** «iPhone · app», «Android · Chrome»: lo legge chi deve scegliere cosa togliere */
  device: v.string(),
  createdAt: v.float64(),
  /**
   * L'ultima volta che il gestionale aperto su quel dispositivo ha confermato
   * l'abbonamento. Safari non avvisa quando le chiavi cambiano, quindi la
   * dashboard lo ripresenta a ogni apertura: è anche la prova che c'è ancora
   * qualcuno dall'altra parte.
   */
  lastSeenAt: v.float64(),
  lastSuccessAt: v.optional(v.float64()),
  /** Perché l'ultimo invio non è passato, finché uno non passa */
  lastError: v.optional(v.string()),
  /** Invii falliti di fila: oltre una soglia la riga si toglie (modules/push/subscriptions.ts) */
  failures: v.float64(),
})
  .index("by_endpoint", ["endpoint"])
  .index("by_user", ["userId"]);

export default pushSubscriptions;
