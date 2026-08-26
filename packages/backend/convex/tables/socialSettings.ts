import { defineTable } from "convex/server";
import { v } from "convex/values";

import { socialPostKind } from "../modules/social/lib";

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
   * I trigger spenti, non quelli accesi.
   *
   * Al contrario di quel che verrebbe da fare, e per una ragione precisa: una
   * riga di configurazione salvata prima che un trigger esistesse non deve
   * tenerlo spento per sempre senza che nessuno capisca il perché.
   */
  disabledKinds: v.array(socialPostKind),
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
