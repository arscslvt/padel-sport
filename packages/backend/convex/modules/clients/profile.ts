import { v } from "convex/values";

import type { Id } from "../../_generated/dataModel";
import { type MutationCtx, mutation } from "../../_generated/server";
import { generatePlayerCode, LEVEL_MAX, LEVEL_MIN } from "../openMatches/lib";
import { assertServer } from "../../utils/serverSecret";
import {
  consents as consentsValidator,
  gender,
  health as healthValidator,
} from "../../tables/players";
import { displayName } from "./lib";

/**
 * L'anagrafica del cliente: quella che compila lui iscrivendosi, e quella che
 * lo staff corregge o completa dalla scheda.
 *
 * Due mutation e non una perché sono due momenti diversi con due permessi
 * diversi: `complete` nasce da un invito e crea il profilo, `update` è la
 * matita dello staff su un profilo che esiste già. Entrambe passano dal segreto
 * condiviso, perché entrambe arrivano da una route del sito che ha già
 * verificato chi sta chiedendo.
 */

/** Livello di partenza: la fascia di mezzo, che la persona correggerà da sé. */
const DEFAULT_LEVEL = 2.5;

const profileFields = {
  firstName: v.optional(v.string()),
  lastName: v.optional(v.string()),
  phone: v.optional(v.string()),
  birthDate: v.optional(v.float64()),
  gender: v.optional(gender),
  level: v.optional(v.float64()),
  taxCode: v.optional(v.string()),
  health: v.optional(healthValidator),
};

/** Ripulisce il blocco sanitario: i campi vuoti non vanno conservati. */
function cleanHealth(
  value:
    | { allergies?: string; conditions?: string; disability?: string }
    | undefined,
) {
  if (!value) return undefined;

  const allergies = value.allergies?.trim() || undefined;
  const conditions = value.conditions?.trim() || undefined;
  const disability = value.disability?.trim() || undefined;

  if (!allergies && !conditions && !disability) return undefined;

  return { allergies, conditions, disability };
}

function assertLevel(level: number | undefined) {
  if (level === undefined) return;

  if (level < LEVEL_MIN || level > LEVEL_MAX) {
    throw new Error(`Il livello deve essere fra ${LEVEL_MIN} e ${LEVEL_MAX}.`);
  }
}

/** Ripulisce i campi di testo: la stringa vuota vale come «non indicato». */
function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

/** Nessun'altra scheda deve avere questo indirizzo: sarebbero due volte la stessa persona. */
async function assertEmailFree(
  ctx: MutationCtx,
  email: string,
  exceptPlayerId?: Id<"players">,
) {
  const taken = await ctx.db
    .query("players")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();

  if (taken && taken._id !== exceptPlayerId) {
    throw new Error(
      `C'è già una scheda con questo indirizzo, intestata a ${displayName(taken)}.`,
    );
  }
}

/**
 * La scheda del cliente, compilata dallo staff allo sportello.
 *
 * Nasce **senza account**: chi si presenta al banco dà i suoi dati lì, e
 * registrarli non deve dipendere dal fatto che poi apra una mail. L'account
 * arriva dopo con l'invito, e per qualcuno non arriva mai.
 *
 * L'email è facoltativa proprio per questo: senza, la scheda vale — è un socio
 * a tutti gli effetti, che paga la quota e gioca — e semplicemente non si può
 * ancora invitare.
 */
export const create = mutation({
  args: {
    secret: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    birthDate: v.optional(v.float64()),
    gender: v.optional(gender),
    level: v.optional(v.float64()),
    taxCode: v.optional(v.string()),
    health: v.optional(healthValidator),
    clubNotes: v.optional(v.string()),
  },
  handler: async (ctx, { secret, ...fields }) => {
    assertServer(secret);
    assertLevel(fields.level);

    const firstName = clean(fields.firstName);
    const lastName = clean(fields.lastName);

    if (!firstName || !lastName) {
      throw new Error("Servono nome e cognome.");
    }

    const email = clean(fields.email)?.toLowerCase();
    if (email) await assertEmailFree(ctx, email);

    return await ctx.db.insert("players", {
      name: displayName({ name: `${firstName} ${lastName}`, firstName, lastName }),
      firstName,
      lastName,
      email,
      phone: clean(fields.phone),
      birthDate: fields.birthDate,
      gender: fields.gender,
      level: fields.level ?? DEFAULT_LEVEL,
      taxCode: clean(fields.taxCode)?.toUpperCase(),
      health: cleanHealth(fields.health),
      clubNotes: clean(fields.clubNotes),
      code: await generatePlayerCode(ctx),
      createdAt: Date.now(),
    });
  },
});

/**
 * Elimina la scheda aperta per sbaglio.
 *
 * Solo quella: si cancella una scheda che non è mai diventata nessuno — senza
 * account e senza aver mai messo piede in campo. Se la persona ha prenotato,
 * giocato o si è iscritta a una cerchia, cancellarla lascerebbe righe che
 * puntano nel vuoto, e il rimedio giusto è correggere i dati, non farla sparire.
 *
 * Tessere e inviti se ne vanno con lei: non sono di nessun altro.
 */
export const remove = mutation({
  args: { secret: v.string(), playerId: v.id("players") },
  handler: async (ctx, { secret, playerId }) => {
    assertServer(secret);

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Scheda non trovata.");

    if (player.clerkUserId) {
      throw new Error(
        "Questa scheda è collegata a un account: annulla prima l'invito.",
      );
    }

    const booking = await ctx.db
      .query("bookings")
      .withIndex("by_created_by_player", (q) => q.eq("createdByPlayer", playerId))
      .first();

    if (booking) {
      throw new Error(
        "Questa persona ha delle prenotazioni: la scheda non si può eliminare.",
      );
    }

    const match = await ctx.db
      .query("openMatches")
      .withIndex("by_creator", (q) => q.eq("creatorId", playerId))
      .first();

    if (match) {
      throw new Error(
        "Questa persona ha delle partite: la scheda non si può eliminare.",
      );
    }

    for (const membership of await ctx.db
      .query("memberships")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect()) {
      await ctx.db.delete(membership._id);
    }

    for (const invite of await ctx.db
      .query("clientInvites")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect()) {
      await ctx.db.delete(invite._id);
    }

    await ctx.db.delete(playerId);
  },
});

export const update = mutation({
  args: {
    secret: v.string(),
    playerId: v.id("players"),
    email: v.optional(v.string()),
    clubNotes: v.optional(v.string()),
    ...profileFields,
  },
  handler: async (ctx, { secret, playerId, ...fields }) => {
    assertServer(secret);
    assertLevel(fields.level);

    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Cliente non trovato.");

    const firstName = clean(fields.firstName) ?? player.firstName;
    const lastName = clean(fields.lastName) ?? player.lastName;

    // L'email si corregge finché è solo un dato nostro. Da quando c'è un
    // account è l'identità su Clerk, e cambiarla qui la farebbe divergere.
    const email = clean(fields.email)?.toLowerCase();

    if (email && email !== player.email) {
      if (player.clerkUserId) {
        throw new Error(
          "Questa scheda ha già un account: l'indirizzo si cambia dal profilo della persona.",
        );
      }
      await assertEmailFree(ctx, email, playerId);
    }

    await ctx.db.patch(playerId, {
      firstName,
      lastName,
      email: email ?? player.email,
      phone: clean(fields.phone) ?? player.phone,
      birthDate: fields.birthDate ?? player.birthDate,
      gender: fields.gender ?? player.gender,
      level: fields.level ?? player.level,
      taxCode: clean(fields.taxCode)?.toUpperCase() ?? player.taxCode,
      // Il blocco sanitario si sostituisce intero: svuotare un campo dev'essere
      // possibile, e con il `??` non lo sarebbe mai.
      health: fields.health ? cleanHealth(fields.health) : player.health,
      clubNotes:
        fields.clubNotes !== undefined
          ? clean(fields.clubNotes)
          : player.clubNotes,
      // Il nome visualizzato segue nome e cognome appena ci sono: è quello che
      // lo staff legge sulle prenotazioni e sulle partite.
      name: displayName({ name: player.name, firstName, lastName }),
    });
  },
});

/**
 * Ricopia da Clerk quello che Clerk sa e noi no.
 *
 * L'email e la foto sono di Clerk, che resta la fonte di verità dell'identità:
 * qui ne teniamo una copia perché senza non si può cercare un cliente per
 * indirizzo — Convex non può interrogare Clerk dentro una query. I profili nati
 * dall'onboarding dell'app non l'hanno mai avuta, e questa è la strada da cui
 * la ricevono: la dashboard, aprendo l'elenco, riallinea quel che manca.
 *
 * Scrive solo dove è vuoto o diverso: non deve sporcare l'anagrafica che lo
 * staff ha corretto a mano.
 */
export const syncFromClerk = mutation({
  args: {
    secret: v.string(),
    people: v.array(
      v.object({
        playerId: v.id("players"),
        email: v.optional(v.string()),
        avatarUrl: v.optional(v.string()),
        firstName: v.optional(v.string()),
        lastName: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { secret, people }) => {
    assertServer(secret);

    let updated = 0;

    for (const person of people) {
      const player = await ctx.db.get(person.playerId);
      if (!player) continue;

      const patch: Record<string, unknown> = {};

      const email = person.email?.trim().toLowerCase();
      if (email && email !== player.email) patch.email = email;

      if (person.avatarUrl && person.avatarUrl !== player.avatarUrl) {
        patch.avatarUrl = person.avatarUrl;
      }

      // Nome e cognome solo se qui non ci sono: su Clerk possono essere quelli
      // scritti in fretta allo sportello, e la scheda vince sempre.
      const firstName = clean(person.firstName);
      const lastName = clean(person.lastName);
      if (firstName && !player.firstName) patch.firstName = firstName;
      if (lastName && !player.lastName) patch.lastName = lastName;

      if (patch.firstName || patch.lastName) {
        patch.name = displayName({
          name: player.name,
          firstName: (patch.firstName as string) ?? player.firstName,
          lastName: (patch.lastName as string) ?? player.lastName,
        });
      }

      if (Object.keys(patch).length === 0) continue;

      await ctx.db.patch(person.playerId, patch);
      updated += 1;
    }

    return { updated };
  },
});

/**
 * Il cliente completa la propria iscrizione, arrivando dall'invito.
 *
 * La scheda **c'è già**: l'ha compilata lo staff allo sportello, e l'invito
 * punta a quella. Qui non si crea niente — si conferma quel che il club aveva
 * scritto, si corregge quel che serve, e soprattutto si danno i consensi, che
 * nessun altro può dare al posto della persona.
 */
export const complete = mutation({
  args: {
    secret: v.string(),
    token: v.string(),
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    phone: v.string(),
    birthDate: v.float64(),
    gender,
    level: v.float64(),
    consents: consentsValidator,
    taxCode: v.optional(v.string()),
    health: v.optional(healthValidator),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);
    assertLevel(args.level);

    const invite = await ctx.db
      .query("clientInvites")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!invite) throw new Error("Invito non trovato.");
    if (invite.status === "revoked") throw new Error("Questo invito è stato annullato.");
    if (invite.status === "accepted") throw new Error("Questo invito è già stato usato.");
    if (invite.expiresAt <= Date.now()) {
      throw new Error("Questo invito è scaduto: chiedine uno nuovo al club.");
    }

    // L'invito è per una persona sola: la sessione che completa dev'essere la
    // sua, non quella di chiunque abbia intercettato il link.
    if (invite.clerkUserId !== args.clerkUserId) {
      throw new Error("Questo invito non è intestato a te.");
    }

    const player = await ctx.db.get(invite.playerId);
    if (!player) throw new Error("La scheda collegata non esiste più.");

    const firstName = clean(args.firstName) ?? player.firstName;
    const lastName = clean(args.lastName) ?? player.lastName;

    await ctx.db.patch(player._id, {
      name: displayName({ name: player.name, firstName, lastName }),
      firstName,
      lastName,
      email: args.email.trim().toLowerCase(),
      phone: args.phone.trim(),
      birthDate: args.birthDate,
      gender: args.gender,
      level: args.level,
      consents: args.consents,
      taxCode: clean(args.taxCode)?.toUpperCase() ?? player.taxCode,
      health: args.health ? cleanHealth(args.health) : player.health,
      clerkUserId: args.clerkUserId,
      avatarUrl: args.avatarUrl ?? player.avatarUrl,
      code: player.code ?? (await generatePlayerCode(ctx)),
      profileCompletedAt: Date.now(),
    });

    await ctx.db.patch(invite._id, {
      status: "accepted",
      acceptedAt: Date.now(),
    });

    return { playerId: player._id };
  },
});
