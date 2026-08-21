import { ConvexError, v } from "convex/values";
import { mutation } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";

/**
 * Registra chi si presenta alla cassa la sera dell'evento.
 *
 * Una spunta per volta, e ogni spunta è un fatto a sé: l'iscritto e i suoi
 * accompagnatori possono arrivare in momenti diversi, quindi segnare presente
 * il primo non dice niente degli altri. È lo staff a decidere, guardando chi ha
 * davanti.
 *
 * `arrived: false` è il ripensamento — si spunta per sbaglio la riga sopra, e
 * disfare deve costare un clic. Per questo la firma non è «registra l'arrivo»
 * ma «lo stato di questa persona ora è questo»: chiamarla due volte di fila con
 * lo stesso valore lascia le cose come stanno.
 *
 * Protetta dal segreto condiviso come `cancel.byStaff`: chi sta in lista non ha
 * titolo per dichiararsi arrivato da solo.
 */
export default mutation({
  args: {
    secret: v.string(),
    id: v.id("eventRsvps"),
    /**
     * Assente vuol dire l'iscritto in persona. Un numero è l'indice 0-based
     * dell'accompagnatore, quello che la lista mostra come «Ospite n+1».
     */
    guestIndex: v.optional(v.float64()),
    arrived: v.boolean(),
  },
  handler: async (ctx, { secret, id, guestIndex, arrived }) => {
    assertServer(secret);

    const rsvp = await ctx.db.get(id);
    if (!rsvp) {
      throw new ConvexError({
        code: "not_found",
        message: "Iscrizione non trovata.",
      });
    }

    // Un'iscrizione annullata non ha nessuno da accogliere: se qualcuno si
    // presenta lo stesso, prima va rimessa in piedi.
    if (rsvp.status !== "confirmed") {
      throw new ConvexError({
        code: "cancelled",
        message: "Questa iscrizione è stata annullata.",
      });
    }

    if (guestIndex === undefined) {
      await ctx.db.patch(id, {
        checkedInAt: arrived ? Date.now() : undefined,
      });
    } else {
      if (!Number.isInteger(guestIndex) || guestIndex < 0) {
        throw new ConvexError({
          code: "bad_guest",
          message: "Accompagnatore non valido.",
        });
      }

      if (guestIndex >= rsvp.guests) {
        throw new ConvexError({
          code: "bad_guest",
          message: "Questa iscrizione non ha un accompagnatore a quel posto.",
        });
      }

      const current = new Set(rsvp.checkedInGuests ?? []);
      if (arrived) {
        current.add(guestIndex);
      } else {
        current.delete(guestIndex);
      }

      await ctx.db.patch(id, {
        // Ordinati e ripuliti dagli indici fuori scala: quel che si rilegge
        // dev'essere già presentabile, senza che chi legge debba rimediare.
        checkedInGuests: [...current]
          .filter((index) => index < rsvp.guests)
          .sort((a, b) => a - b),
      });
    }

    const updated = await ctx.db.get(id);

    return {
      id,
      checkedInAt: updated?.checkedInAt,
      checkedInGuests: updated?.checkedInGuests ?? [],
    };
  },
});
