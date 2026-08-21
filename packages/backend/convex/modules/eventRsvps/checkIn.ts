import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Registra chi si è presentato alla cassa: un elenco intero per volta.
 *
 * Non dice «spunta questa persona» ma «lo stato adesso è questo». La differenza
 * conta perché alla cassa si spunta a raffica: con una chiamata per casella le
 * risposte tornano fuori ordine, e quella della prima — calcolata prima che la
 * seconda partisse — riporta indietro lo stato appena scritto. La casella si
 * smarca da sola sotto le dita. Mandando lo stato intero l'ultima scrittura
 * vince, ed è sempre quella giusta.
 *
 * Protetta dal segreto condiviso come `cancel.byStaff`: chi sta in lista non ha
 * titolo per dichiararsi arrivato da solo.
 */
export default mutation({
  args: {
    secret: v.string(),
    entries: v.array(
      v.object({
        id: v.id("eventRsvps"),
        /** L'iscritto in persona. */
        arrived: v.boolean(),
        /** Indici 0-based degli accompagnatori arrivati. */
        guests: v.array(v.float64()),
      }),
    ),
  },
  handler: async (ctx, { secret, entries }) => {
    assertServer(secret);

    if (entries.length > 500) {
      throw new ConvexError({
        code: "too_many",
        message: "Troppe iscrizioni in una volta sola.",
      });
    }

    const saved: Array<{
      id: string;
      checkedInAt?: number;
      checkedInGuests: number[];
    }> = [];
    const skipped: string[] = [];

    for (const entry of entries) {
      const rsvp = await ctx.db.get(entry.id);

      /*
       * Una riga sparita o annullata nel frattempo si salta invece di far
       * fallire tutto: la mutation è transazionale, quindi un'eccezione qui
       * butterebbe via anche le venti spunte buone che le stanno accanto — e
       * chi è in cassa le rifarebbe a mano senza sapere perché.
       */
      if (!rsvp || rsvp.status !== "confirmed") {
        skipped.push(entry.id);
        continue;
      }

      /*
       * L'ora d'arrivo è quella della prima spunta. Risalvare lo stesso stato
       * non la sposta in avanti: altrimenti in banca dati resterebbe l'ora
       * dell'ultimo salvataggio, non quella in cui la persona è entrata.
       */
      const checkedInAt = entry.arrived
        ? (rsvp.checkedInAt ?? Date.now())
        : undefined;

      const checkedInGuests = [...new Set(entry.guests)]
        .filter(
          (index) =>
            Number.isInteger(index) && index >= 0 && index < rsvp.guests,
        )
        .sort((a, b) => a - b);

      await ctx.db.patch(entry.id, { checkedInAt, checkedInGuests });
      saved.push({ id: entry.id, checkedInAt, checkedInGuests });
    }

    return { saved, skipped };
  },
});
