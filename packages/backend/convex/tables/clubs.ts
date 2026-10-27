import { defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * I club che usano il gestionale, uno per riga.
 *
 * Ogni altra tabella porta un `clubId` che punta qui: è la base del passaggio
 * da un club solo a tanti club sullo stesso deployment (docs/multi-club.md).
 * Per ora la riga è una, Padel Sport, e il resto del codice legge ancora le
 * costanti di sempre (fuso orario in utils/clubTime.ts, coordinate in
 * modules/weather/refresh.ts): i campi qui sotto le sostituiranno nella Fase 2.
 *
 * Niente segreti in questa tabella: le chiavi di SumUp, Twilio e Google
 * restano nelle variabili d'ambiente finché il club è uno.
 */
const clubs = defineTable({
  /** Il nome breve negli indirizzi e nella configurazione ("padel-sport"). */
  slug: v.string(),
  /** Il nome per esteso, quello che leggono i giocatori. */
  name: v.string(),
  /** Fuso IANA in cui si leggono orari e giorni del club ("Europe/Rome"). */
  timeZone: v.string(),
  /** Dove sta il club: serve al meteo. */
  latitude: v.float64(),
  longitude: v.float64(),
  /**
   * L'organizzazione Clerk dello staff del club. Opzionale finché la
   * dashboard non la passa a Convex (Fase 2): dev e prod hanno istanze
   * Clerk diverse, quindi l'id non si scrive nel codice.
   */
  clerkOrgId: v.optional(v.string()),
  /**
   * Club in manutenzione: sito, gestionale e app mostrano una pagina d'attesa
   * e le scritture si fermano. Lo leggeranno i wrapper della Fase 2.
   */
  maintenance: v.optional(v.boolean()),
})
  .index("by_slug", ["slug"])
  .index("by_clerk_org", ["clerkOrgId"]);

export default clubs;
