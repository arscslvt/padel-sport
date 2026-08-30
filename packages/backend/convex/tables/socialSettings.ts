import { defineTable } from "convex/server";
import { v } from "convex/values";

import { socialMode, socialPostKind } from "../modules/social/lib";

/**
 * Come parla il circolo sui social: un'unica riga, gestita dalla dashboard.
 *
 * L'interruttore generale non è un vezzo da pannello di controllo. Questa è
 * l'unica parte del sistema che si rivolge al pubblico da sola, e chi la
 * gestisce deve poterla zittire senza aspettare un rilascio — la sera in cui
 * esce qualcosa di sbagliato non si apre un editor.
 *
 * Qui sta il *come suona*, non il *cosa si può dire*. I divieti veri — niente
 * nomi propri, niente prezzi inventati — stanno nel codice del prompt, perché
 * sono regole di sicurezza e vogliono una revisione, non una casella di testo
 * modificabile alle undici di sera.
 */
const socialSettings = defineTable({
  enabled: v.boolean(),
  /**
   * Come si comporta ogni categoria: manuale, con approvazione, autonoma.
   *
   * Facoltativo perché una riga salvata prima che questo campo esistesse deve
   * continuare a funzionare: chi legge ricava la modalità dal vecchio elenco di
   * trigger spenti, e dai valori di partenza per tutto il resto. Una categoria
   * che non compare qui non è spenta — prende il proprio valore di partenza,
   * altrimenti aggiungere un trigger nuovo lo lascerebbe muto per sempre senza
   * che nessuno capisca il perché.
   */
  modes: v.optional(
    // Un elenco di coppie e non un dizionario: Convex non accetta chiavi
    // letterali nei record, e una chiave `v.string()` libera lascerebbe entrare
    // categorie che non esistono.
    v.array(v.object({ kind: socialPostKind, mode: socialMode })),
  ),
  /**
   * Il campo che `modes` ha sostituito.
   *
   * Resta soltanto perché le righe salvate prima continuino a essere leggibili.
   * Non lo scrive più nessuno.
   *
   * @deprecated
   */
  disabledKinds: v.optional(v.array(socialPostKind)),
  /** Tetto giornaliero su tutti i trigger insieme. */
  maxPerDay: v.float64(),
  tone: v.string(),
  avoid: v.string(),
  baseHashtags: v.array(v.string()),
  updatedAt: v.float64(),
  /** Chi dello staff ha toccato la configurazione per ultimo. */
  updatedBy: v.optional(v.string()),
});

export default socialSettings;
