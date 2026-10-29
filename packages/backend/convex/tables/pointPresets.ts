import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Le causali già pronte con cui lo staff carica o toglie punti: «partita
 * vinta, +3» invece di un numero e una frase da riscrivere ogni volta.
 *
 * `points` ha il segno: un preset può anche togliere (una penalità, un no-show).
 *
 * Non si cancellano, si archiviano: i movimenti ne conservano il nome, ma
 * tenere la riga dice anche che il club quella causale l'ha avuta — ed è ciò
 * che impedisce di riseminare il preset di partenza dopo che lo staff l'ha
 * tolto (modules/points/presets.ts).
 */
const pointPresets = defineTable({
  /** Il club della riga (docs/multi-club.md). */
  clubId: v.id("clubs"),
  label: v.string(),
  points: v.float64(),
  archived: v.boolean(),
  createdAt: v.float64(),
})
  .index("by_archived", ["archived"])
  .index("by_club_archived", ["clubId", "archived"]);

export default pointPresets;
