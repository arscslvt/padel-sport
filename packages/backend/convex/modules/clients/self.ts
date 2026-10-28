import { v } from "convex/values";

import type { QueryCtx } from "../../_generated/server";
import {
  clubMutation,
  clubQuery,
  serverMutation,
  serverQuery,
} from "../../functions";
import { residence as residenceValidator } from "../../tables/players";
import { getIdentityPlayer, requirePlayer } from "../openMatches/lib";
import { displayName } from "./lib";
import { HEALTH_CONSENT_REQUIRED } from "./profile";

/**
 * L'anagrafica vista e corretta dalla persona stessa, dall'area personale.
 *
 * Diversa da `profile.ts` per chi chiede: lì passa il segreto di una route
 * dello staff, qui l'identità di Clerk, e nessun argomento permette di
 * toccare la scheda di un altro.
 *
 * La persona corregge solo quel che sa meglio del club: email, telefono,
 * residenza, allergie e condizioni mediche. Nome, nascita e codice fiscale
 * sono i dati del tesseramento e li corregge lo staff con un documento
 * davanti.
 *
 * Dai dati sanitari passa anche il consenso esplicito (art. 9 GDPR): si dà e
 * si revoca da qui, e senza consenso i dati sanitari non restano.
 */

const MAX_HEALTH = 500;

export const me = clubQuery({
  args: {},
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx);
    if (!player) return null;

    // Le note del club restano fuori: non sono scritte per la persona.
    return {
      firstName: player.firstName,
      lastName: player.lastName,
      name: player.name,
      email: player.email,
      phone: player.phone,
      birthDate: player.birthDate,
      birthPlace: player.birthPlace,
      taxCode: player.taxCode,
      residence: player.residence,
      health: {
        allergies: player.health?.allergies,
        conditions: player.health?.conditions,
      },
      // Dati sanitari scritti allo sportello valgono come consenso dato: lì
      // la persona firma il modulo. La casella parte spuntata solo così.
      healthConsent: Boolean(player.healthConsentAt || player.health),
      searchable: Boolean(player.searchableSince),
    };
  },
});

/**
 * Farsi trovare, o no, da chi compone la squadra di una prenotazione. Si
 * salva da solo, senza il resto del modulo: è un consenso, non un dato.
 */
export const setSearchable = clubMutation({
  args: { searchable: v.boolean() },
  handler: async (ctx, { searchable }) => {
    const player = await requirePlayer(ctx);
    await ctx.db.patch(player._id, {
      searchableSince: searchable
        ? (player.searchableSince ?? Date.now())
        : undefined,
    });
  },
});

/** Un CAP vuoto si accetta, uno sbagliato no. */
function cleanResidence(
  value: { address?: string; city?: string; postalCode?: string } | undefined,
) {
  if (!value) return undefined;

  const address = value.address?.trim() || undefined;
  const city = value.city?.trim() || undefined;
  const postalCode = value.postalCode?.trim() || undefined;

  if (postalCode && !/^\d{5}$/.test(postalCode)) {
    throw new Error("Il CAP deve essere di cinque cifre.");
  }

  if (!address && !city && !postalCode) return undefined;
  return { address, city, postalCode };
}

function cleanHealthText(value: string | undefined, label: string) {
  const trimmed = value?.trim() || undefined;
  if (trimmed && trimmed.length > MAX_HEALTH) {
    throw new Error(`${label}: resta sotto i ${MAX_HEALTH} caratteri.`);
  }
  return trimmed;
}

/** Telefono, residenza e salute: quel che la persona scrive da sé. */
export const update = clubMutation({
  args: {
    phone: v.string(),
    residence: v.optional(residenceValidator),
    health: v.object({
      allergies: v.optional(v.string()),
      conditions: v.optional(v.string()),
    }),
    /**
     * Facoltativo solo per le pagine aperte prima che esistesse la casella:
     * senza, vale il consenso già registrato.
     */
    healthConsent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const player = await requirePlayer(ctx);

    const phone = args.phone.trim().replace(/\s+/g, "");
    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      throw new Error("Inserisci un numero di telefono valido.");
    }

    const allergies = cleanHealthText(
      args.health.allergies,
      "Allergie e intolleranze",
    );
    const conditions = cleanHealthText(
      args.health.conditions,
      "Condizioni mediche",
    );

    const healthConsent =
      args.healthConsent ??
      Boolean(player.healthConsentAt || player.health);

    if ((allergies || conditions) && !healthConsent) {
      throw new Error(HEALTH_CONSENT_REQUIRED);
    }

    // La disabilità la registra lo staff allo sportello: qui non si vede e,
    // finché il consenso resta, non si deve perdere. Revocandolo se ne va
    // con il resto, perché il no vale per tutti i dati sanitari.
    const disability = healthConsent ? player.health?.disability : undefined;

    // Chi ha dati sanitari scritti allo sportello ha il consenso sul modulo
    // firmato: la casella spuntata qui lo conferma, non ne registra uno nuovo.
    const healthConsentAt = !healthConsent
      ? undefined
      : (player.healthConsentAt ?? (player.health ? undefined : Date.now()));

    await ctx.db.patch(player._id, {
      phone,
      // L'indirizzo si sostituisce intero: svuotarlo dev'essere possibile.
      residence: cleanResidence(args.residence),
      health:
        allergies || conditions || disability
          ? { allergies, conditions, disability }
          : undefined,
      healthConsentAt,
    });
  },
});

/** L'indirizzo è libero, o è già di questa stessa scheda? */
async function emailTakenBy(ctx: QueryCtx, email: string, clerkUserId: string) {
  const taken = await ctx.db
    .query("players")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  return taken && taken.clerkUserId !== clerkUserId ? taken : null;
}

/**
 * Prima di chiedere il codice a Clerk: un indirizzo che appartiene alla scheda
 * di un'altra persona farebbe divergere account e anagrafica, e conviene
 * dirlo prima che la persona apra la posta.
 */
export const emailAvailable = serverQuery({
  args: { clerkUserId: v.string(), email: v.string() },
  handler: async (ctx, { clerkUserId, email }) => {
    const taken = await emailTakenBy(
      ctx,
      email.trim().toLowerCase(),
      clerkUserId,
    );
    return { available: !taken };
  },
});

/**
 * Ricopia sulla scheda l'email appena verificata su Clerk.
 *
 * Passa dal segreto e non dall'identità perché l'indirizzo non può arrivare
 * dal browser: lo legge la route del sito da Clerk dopo la verifica con il
 * codice (app/api/me/email), e solo allora è sicuro che sia della persona.
 */
export const syncEmail = serverMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, { clerkUserId, email }) => {
    const player = await ctx.db
      .query("players")
      .withIndex("by_clerk_user_id", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();
    if (!player) throw new Error("Scheda non trovata.");

    const normalized = email.trim().toLowerCase();
    if (normalized === player.email) return;

    const taken = await emailTakenBy(ctx, normalized, clerkUserId);
    if (taken) {
      throw new Error(
        `C'è già una scheda con questo indirizzo, intestata a ${displayName(taken)}. Contatta il club.`,
      );
    }

    await ctx.db.patch(player._id, { email: normalized });
  },
});
