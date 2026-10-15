import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Le azioni che fanno guadagnare punti da sole, senza che lo staff li carichi.
 *
 * Quali azioni esistono lo decide il codice (modules/points/rules.ts): ognuna
 * ha bisogno di un aggancio nel punto in cui succede, e il gestionale non può
 * inventarne di nuove. Dal gestionale si sceglie invece se sono accese e
 * quanti punti valgono.
 *
 * Una riga per azione, nata quando il programma automatico è partito
 * (modules/points/backfill.ts) o la prima volta che un amministratore la
 * salva. Senza riga l'azione è spenta.
 *
 * `since` è il giorno da cui l'azione conta: non premia quello che è
 * successo prima, altrimenti chi gioca da anni riceverebbe la «prima partita»
 * alla prossima prenotazione. Non cambia quando si spegne e si riaccende.
 */
const pointRuleKey = v.union(
  v.literal("first_match"),
  v.literal("weekly_three"),
  v.literal("online_payment"),
  v.literal("referral"),
  v.literal("referral_welcome"),
);

const pointRules = defineTable({
  key: pointRuleKey,
  points: v.float64(),
  enabled: v.boolean(),
  since: v.float64(),
  updatedAt: v.float64(),
  updatedByClerkUserId: v.optional(v.string()),
}).index("by_key", ["key"]);

export default pointRules;
export { pointRuleKey };
