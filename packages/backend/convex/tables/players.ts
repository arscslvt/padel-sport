import { defineTable } from "convex/server";
import { v } from "convex/values";

/** Come si identifica il cliente, quando gliel'abbiamo chiesto. */
const gender = v.union(
  v.literal("f"),
  v.literal("m"),
  v.literal("other"),
  v.literal("unspecified"),
);

/**
 * Consensi raccolti durante l'iscrizione, con la data in cui sono stati dati.
 *
 * Sono tre e restano distinti perché il club li ha chiesti distinti: chi vuole
 * la newsletter non ha per forza accettato il resto, e un consenso unico non si
 * potrebbe revocare a metà. L'assenza dell'oggetto significa «mai chiesti», che
 * è diverso da tre no.
 */
const consents = v.object({
  marketing: v.boolean(),
  newsletter: v.boolean(),
  tracking: v.boolean(),
  updatedAt: v.float64(),
});

/**
 * Dove abita il socio: serve al tesseramento e alle ricevute.
 *
 * Un oggetto e non tre campi sparsi perché un indirizzo si scrive e si corregge
 * tutto insieme — via, città e CAP separati non vogliono dire niente.
 */
const residence = v.object({
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  /** CAP italiano: cinque cifre. */
  postalCode: v.optional(v.string()),
});

/**
 * Quel che il club deve sapere per far scendere in campo qualcuno in sicurezza.
 *
 * Sono **dati sanitari**: categoria particolare, non anagrafica. Stanno in un
 * oggetto a parte proprio per questo — si vedono aprendo una scheda, non
 * scorrendo un elenco, e chi un giorno esporterà l'anagrafica sa cosa deve
 * lasciare fuori. Tutti facoltativi: la stragrande maggioranza delle schede non
 * ne avrà nessuno.
 */
const health = v.object({
  /** Allergie da conoscere in caso di malore o di rinfresco al circolo. */
  allergies: v.optional(v.string()),
  /** Condizioni mediche di cui il club dev'essere al corrente. */
  conditions: v.optional(v.string()),
  /** Invalidità: testo libero, perché serve la descrizione, non un flag. */
  disability: v.optional(v.string()),
});

/**
 * Profilo giocatore collegato all'utente Clerk, e insieme anagrafica del cliente.
 * Il livello segue la scala padel 1.0 – 5.0.
 *
 * Anagrafica e profilo stanno nella stessa riga di proposito: un cliente del
 * club *è* un giocatore, e due tabelle separate finirebbero prima o poi per non
 * essere d'accordo su chi sia la stessa persona.
 *
 * `code` è il codice pubblico con cui gli amici si cercano tra loro: è
 * opzionale perché i profili creati prima della sua introduzione lo ricevono
 * al primo salvataggio (modules/openMatches/players.ts).
 *
 * Nome e cognome sono facoltativi per la stessa ragione: i profili nati
 * dall'onboarding dell'app hanno solo `name`, che resta il nome visualizzato
 * ovunque — prenotazioni, partite, inviti. Quando ci sono, `name` si ricompone
 * da loro (modules/clients/lib.ts).
 *
 * `email` è una copia di quella su Clerk quando un account c'è, e il dato
 * originale quando non c'è ancora: serve a cercare un cliente e a vederlo in
 * scheda senza dover interrogare Clerk una volta per riga.
 *
 * `clerkUserId` è **opzionale**: la scheda nasce allo sportello, l'account
 * arriva dopo con l'invito — e per qualcuno non arriva mai. Il socio che paga
 * la quota in contanti e gioca il martedì è un cliente a tutti gli effetti
 * anche senza aver mai aperto l'app; semplicemente non può prenotare online,
 * perché non c'è nessuno da autenticare.
 */
const players = defineTable({
  clerkUserId: v.optional(v.string()),
  name: v.string(),
  level: v.float64(),
  avatarUrl: v.optional(v.string()),
  code: v.optional(v.string()),
  createdAt: v.float64(),

  // Anagrafica del cliente
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  email: v.optional(v.string()),
  phone: v.optional(v.string()),
  birthDate: v.optional(v.float64()),
  /** Comune di nascita: insieme alla data serve al codice fiscale e al tesseramento. */
  birthPlace: v.optional(v.string()),
  gender: v.optional(gender),
  consents: v.optional(consents),
  residence: v.optional(residence),
  /** Codice fiscale: serve al tesseramento e alle ricevute. */
  taxCode: v.optional(v.string()),
  health: v.optional(health),
  /**
   * Note interne del club sulla persona.
   *
   * Le scrive lo staff e le legge lo staff: non compaiono mai a chi attiva il
   * proprio account, che leggerebbe un giudizio su di sé scritto per altri.
   */
  clubNotes: v.optional(v.string()),
  /** Quando la persona ha completato la propria iscrizione dal sito. */
  profileCompletedAt: v.optional(v.float64()),
})
  .index("by_clerk_user_id", ["clerkUserId"])
  .index("by_code", ["code"])
  .index("by_email", ["email"])
  .searchIndex("by_name", { searchField: "name" });

export default players;
export { consents, gender, health, residence };
