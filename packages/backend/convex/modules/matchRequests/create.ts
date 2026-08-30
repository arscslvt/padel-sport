import { v } from "convex/values";
import { internal } from "../../_generated/api";
import { mutation } from "../../_generated/server";
import { matchRequestLevel } from "../../tables/matchRequests";
import { triggerKeyFor } from "../social/lib";

const DEFAULT_COUNTRY_CODE = "+39";

/**
 * Registra una richiesta di giocatori inviata dal modulo pubblico del sito.
 *
 * Il salvataggio è la fonte di verità: le mail di notifica partono dopo, e un
 * loro fallimento non deve far perdere la richiesta.
 */
export default mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    matchDate: v.number(),
    level: matchRequestLevel,
    missingPlayers: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name.trim();
    if (name.length < 2) {
      throw new Error("Inserisci il tuo nome.");
    }

    const email = args.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      throw new Error("Inserisci un indirizzo email valido.");
    }

    const normalizedPhone = args.phone.trim().replace(/\s+/g, "");
    const phone = normalizedPhone.startsWith("+")
      ? normalizedPhone
      : DEFAULT_COUNTRY_CODE + normalizedPhone;

    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      throw new Error("Inserisci un numero di telefono valido.");
    }

    if (args.matchDate <= Date.now()) {
      throw new Error("La data e l'ora devono essere nel futuro.");
    }

    if (!Number.isInteger(args.missingPlayers)) {
      throw new Error("Il numero di giocatori mancanti non è valido.");
    }

    if (args.missingPlayers < 1 || args.missingPlayers > 3) {
      throw new Error("Puoi cercare da 1 a 3 giocatori.");
    }

    const requestId = await ctx.db.insert("matchRequests", {
      name,
      email,
      phone,
      matchDate: args.matchDate,
      level: args.level,
      missingPlayers: args.missingPlayers,
      notes: args.notes?.trim() || undefined,
      status: "new",
      createdAt: Date.now(),
    });

    // La storia che cerca giocatori parte da qui, dentro la mutation, e non
    // dalla route che manda le mail: così vale anche se un domani la richiesta
    // arrivasse da un'altra strada. Accodata e non chiamata subito, perché un
    // intoppo nel lato social non deve far perdere la richiesta — che è la
    // stessa ragione per cui le mail partono dopo il salvataggio.
    //
    // Nome, mail e telefono restano qui: il contenuto che ne nasce riceve solo
    // data, livello e quanti ne mancano.
    await ctx.scheduler.runAfter(0, internal.modules.social.enqueue.default, {
      kind: "player_request",
      triggerKey: triggerKeyFor({ kind: "player_request", requestId }),
      subjectId: requestId,
    });

    return requestId;
  },
});
