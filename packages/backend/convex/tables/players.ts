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
  /** Il club della riga (docs/multi-club.md). Opzionale fino alla Fase 3. */
  clubId: v.optional(v.id("clubs")),
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
   * Quando la persona ha dato online il consenso esplicito ai dati sanitari
   * (art. 9 GDPR), dall'attivazione dell'account o dal profilo.
   *
   * Assente non vuol dire per forza «senza consenso»: i dati scritti dallo
   * staff allo sportello hanno il consenso sul modulo firmato, che resta
   * cartaceo. Revocandolo dal profilo il blocco `health` se ne va con lui
   * (modules/clients/self.ts).
   */
  healthConsentAt: v.optional(v.float64()),
  /**
   * Note interne del club sulla persona.
   *
   * Le scrive lo staff e le legge lo staff: non compaiono mai a chi attiva il
   * proprio account, che leggerebbe un giudizio su di sé scritto per altri.
   */
  clubNotes: v.optional(v.string()),
  /**
   * Da quando la persona accetta di essere trovata per nome da altri clienti
   * che compongono la squadra di una prenotazione (modules/openMatches/search.ts).
   * Lo dà e lo toglie dall'area personale; assente vuol dire no. Chi la trova
   * può solo invitarla: entra in partita se accetta l'invito.
   *
   * Lo staff non ne ha bisogno: dal gestionale vede già tutti i clienti.
   */
  searchableSince: v.optional(v.float64()),
  /** Quando la persona ha completato la propria iscrizione dal sito. */
  profileCompletedAt: v.optional(v.float64()),
  /**
   * Già cliente del club prima di avere la scheda: giocava da noi ma non era
   * ancora registrato in digitale. Lo segna lo staff quando apre la scheda, o
   * dopo dalla linguetta Punti. Non riceve «Prima partita»
   * (modules/points/rules.ts).
   */
  existingClient: v.optional(v.boolean()),
  /**
   * Saldo punti: copia di comodo della somma di `pointTransactions`, che resta
   * la verità. Assente vale zero — è il punto di partenza di tutti.
   */
  points: v.optional(v.float64()),
  /**
   * Adesione al programma punti: senza, il conto resta chiuso
   * (modules/points/terms.ts). `version` è il regolamento accettato, `via` dice
   * se dall'area personale o con un modulo firmato allo sportello.
   *
   * `exit` è l'uscita confermata dalla persona (modules/points/exit.ts): per
   * dieci giorni può ancora riscattare, poi i punti non usati decadono e
   * `closedAt` segna la chiusura del conto. `via` dice se l'ha fatta dall'area
   * personale o dal link che la segreteria le ha mandato via mail: lo staff
   * da solo non può farla uscire. Aderire di nuovo riscrive tutto l'oggetto,
   * uscita compresa.
   */
  pointsProgram: v.optional(
    v.object({
      acceptedAt: v.float64(),
      version: v.string(),
      via: v.union(v.literal("online"), v.literal("desk")),
      recordedByClerkUserId: v.optional(v.string()),
      exit: v.optional(
        v.object({
          requestedAt: v.float64(),
          via: v.union(v.literal("online"), v.literal("email")),
          closedAt: v.optional(v.float64()),
        }),
      ),
    }),
  ),
  /**
   * Account sospeso dallo staff (modules/clients/suspension.ts).
   *
   * Finché c'è, la persona non entra né dal sito né dall'app — l'accesso lo
   * chiude Clerk — e i punti restano fermi: suoi, ma non si caricano né si
   * spendono. Il motivo è quello che le abbiamo scritto nella mail.
   */
  suspension: v.optional(
    v.object({
      reason: v.string(),
      suspendedAt: v.float64(),
      suspendedByClerkUserId: v.optional(v.string()),
    }),
  ),
  /**
   * Eliminazione dell'account (modules/clients/deletion.ts).
   *
   * Controllata: chiesta dalla persona o dallo staff, diventa effettiva a
   * `effectiveAt`, trenta giorni dopo; fino ad allora si annulla e l'account
   * funziona come sempre. Immediata: `effectiveAt` è il momento della
   * richiesta.
   *
   * Effettiva (`deletedAt`): l'utente Clerk viene cancellato e la scheda resta
   * congelata come copia, senza email, account né codice — li tiene `backup`
   * — così non la trova più nessuna ricerca né un nuovo accesso. A `purgeAt`,
   * un anno dopo, se ne va del tutto.
   */
  deletion: v.optional(
    v.object({
      requestedAt: v.float64(),
      requestedBy: v.union(v.literal("self"), v.literal("staff")),
      requestedByClerkUserId: v.optional(v.string()),
      effectiveAt: v.float64(),
      deletedAt: v.optional(v.float64()),
      purgeAt: v.optional(v.float64()),
      backup: v.optional(
        v.object({
          clerkUserId: v.optional(v.string()),
          email: v.optional(v.string()),
          code: v.optional(v.string()),
        }),
      ),
    }),
  ),
})
  .index("by_clerk_user_id", ["clerkUserId"])
  .index("by_code", ["code"])
  .index("by_email", ["email"])
  .index("by_deletion_effective", ["deletion.effectiveAt"])
  .index("by_deletion_purge", ["deletion.purgeAt"])
  .searchIndex("by_name", { searchField: "name" })
  .index("by_club_clerk_user_id", ["clubId", "clerkUserId"])
  .index("by_club_email", ["clubId", "email"])
  .index("by_club_code", ["clubId", "code"])
  // Il filtro va dentro l'indice: le regole per riga scartano gli altri club
  // uno a uno, dopo averli letti, e una ricerca legge un numero limitato di
  // risultati. Con tanti club, quelli del club potrebbero non arrivarci.
  .searchIndex("by_club_name", { searchField: "name", filterFields: ["clubId"] });

export default players;
export { consents, gender, health, residence };
