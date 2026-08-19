import { defineTable } from "convex/server";
import { v } from "convex/values";

const clientInviteStatus = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("revoked"),
);

/**
 * Invito ad aprire l'account collegato a una scheda cliente.
 *
 * Non è l'atto di nascita del cliente — quello è la scheda, che lo staff
 * compila allo sportello — ma il momento in cui a quella scheda si aggancia un
 * modo di accedere. `token` è il link: chi ce l'ha può leggere il proprio
 * invito senza essere ancora autenticato, quindi va estratto a caso e trattato
 * come una password.
 *
 * `clerkUserId` c'è fin da subito: l'account viene creato al momento
 * dell'invito, senza password, così la verifica può usare lo stesso codice via
 * mail delle prenotazioni invece di un secondo meccanismo di registrazione.
 *
 * L'invito revocato o accettato non si cancella: dice allo staff che quella
 * persona è già stata invitata, quando e quante volte.
 */
const clientInvites = defineTable({
  token: v.string(),
  email: v.string(),
  firstName: v.string(),
  lastName: v.string(),
  /** Chi dello staff ha invitato: utile quando si chiede «e questo chi è?». */
  invitedByClerkUserId: v.optional(v.string()),
  clerkUserId: v.string(),
  /**
   * L'account l'abbiamo aperto noi con questo invito?
   * Se no, apparteneva già alla persona (registrata dall'app) e revocando
   * l'invito non è roba nostra da cancellare.
   */
  accountCreatedByInvite: v.boolean(),
  status: clientInviteStatus,
  /** La scheda a cui l'invito appartiene: esiste sempre prima dell'invito. */
  playerId: v.id("players"),
  createdAt: v.float64(),
  /** Quando è partita l'ultima mail: è il «già invitato» che vede lo staff. */
  lastSentAt: v.float64(),
  /** Quante volte: distingue un sollecito da un primo invito. */
  sentCount: v.float64(),
  expiresAt: v.float64(),
  acceptedAt: v.optional(v.float64()),
})
  .index("by_token", ["token"])
  .index("by_email", ["email"])
  .index("by_player", ["playerId"])
  .index("by_status", ["status"]);

export default clientInvites;
export { clientInviteStatus };
