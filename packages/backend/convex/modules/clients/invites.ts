import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import { displayName } from "./lib";

/**
 * L'invito ad aprire l'account collegato a una scheda cliente.
 *
 * L'ordine conta: la scheda esiste già, compilata allo sportello, e l'invito
 * arriva dopo — se arriva. Essere socio del club e avere un account con cui
 * prenotare online sono due cose diverse, e questo modulo si occupa solo della
 * seconda.
 */

/** Un invito vale un mese: oltre, meglio rimandarlo che riesumarlo. */
const INVITE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * L'invito visto da chi apre il link.
 *
 * È l'unica lettura pubblica di questo modulo, protetta dal solo token — che
 * però *è* la credenziale: senza, non si ottiene niente. Restituisce anche i
 * dati della scheda perché la persona non deve riscrivere quello che il club ha
 * già inserito: sono i suoi dati, e li sta leggendo chi ha il link in mano.
 */
export const byToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const invite = await ctx.db
      .query("clientInvites")
      .withIndex("by_token", (q) => q.eq("token", token))
      .unique();

    if (!invite) return null;

    const expired = invite.expiresAt <= Date.now();
    const status =
      expired && invite.status === "pending" ? "expired" : invite.status;

    if (status !== "pending") {
      return {
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        status,
        profile: null,
      };
    }

    const player = await ctx.db.get(invite.playerId);

    return {
      email: invite.email,
      firstName: invite.firstName,
      lastName: invite.lastName,
      status,
      profile: player
        ? {
            firstName: player.firstName ?? invite.firstName,
            lastName: player.lastName ?? invite.lastName,
            phone: player.phone,
            birthDate: player.birthDate,
            gender: player.gender,
            level: player.level,
            taxCode: player.taxCode,
            residence: player.residence,
            // Solo i suoi: le note del club le scrive lo staff per sé, e chi
            // attiva l'account leggerebbe un giudizio scritto per altri.
            health: player.health,
          }
        : null,
    };
  },
});

/**
 * Manda l'invito, o lo rimanda.
 *
 * Una mutation sola per i due gesti: rimandare è ruotare il token e far
 * ripartire la scadenza, e tenerli separati vorrebbe dire scrivere due volte le
 * stesse quattro righe con il rischio che una delle due dimentichi qualcosa.
 *
 * Da qui in poi scheda e account sono la stessa persona: `clerkUserId` finisce
 * sul giocatore, e chi accede con quel codice via mail trova la sua anagrafica
 * già pronta invece di ricominciare da capo.
 */
export const send = mutation({
  args: {
    secret: v.string(),
    playerId: v.id("players"),
    token: v.string(),
    clerkUserId: v.string(),
    accountCreatedByInvite: v.boolean(),
    invitedByClerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertServer(args.secret);

    const player = await ctx.db.get(args.playerId);
    if (!player) throw new Error("Scheda non trovata.");

    const email = player.email?.trim().toLowerCase();
    if (!email) {
      throw new Error(
        "Questa scheda non ha un indirizzo email: aggiungilo prima di invitare.",
      );
    }

    await ctx.db.patch(args.playerId, { clerkUserId: args.clerkUserId });

    const now = Date.now();

    const existing = await ctx.db
      .query("clientInvites")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    const open = existing.find((row) => row.status === "pending");

    if (open) {
      // Il vecchio link smette di funzionare: un invito rimandato è un invito,
      // non un secondo modo di entrare che resta aperto in giro.
      await ctx.db.patch(open._id, {
        token: args.token,
        email,
        clerkUserId: args.clerkUserId,
        lastSentAt: now,
        sentCount: open.sentCount + 1,
        expiresAt: now + INVITE_TTL_MS,
      });

      return { inviteId: open._id, sentCount: open.sentCount + 1 };
    }

    const inviteId = await ctx.db.insert("clientInvites", {
      token: args.token,
      email,
      firstName: player.firstName ?? displayName(player),
      lastName: player.lastName ?? "",
      invitedByClerkUserId: args.invitedByClerkUserId,
      clerkUserId: args.clerkUserId,
      accountCreatedByInvite: args.accountCreatedByInvite,
      status: "pending",
      playerId: args.playerId,
      createdAt: now,
      lastSentAt: now,
      sentCount: 1,
      expiresAt: now + INVITE_TTL_MS,
    });

    return { inviteId, sentCount: 1 };
  },
});

/**
 * Annulla l'invito e stacca la scheda dall'account.
 *
 * Senza lo scollegamento revocare non vorrebbe dire niente: la persona
 * potrebbe comunque accedere col codice via mail e ritrovarsi dentro con
 * l'anagrafica già collegata. Dice al chiamante se l'account Clerk è da
 * chiudere — solo se l'avevamo aperto noi e non l'ha mai usato.
 */
export const revoke = mutation({
  args: { secret: v.string(), playerId: v.id("players") },
  handler: async (ctx, { secret, playerId }) => {
    assertServer(secret);

    const invites = await ctx.db
      .query("clientInvites")
      .withIndex("by_player", (q) => q.eq("playerId", playerId))
      .collect();

    const open = invites.find((row) => row.status === "pending");
    if (!open) throw new Error("Non c'è nessun invito da annullare.");

    await ctx.db.patch(open._id, { status: "revoked" });
    await ctx.db.patch(playerId, { clerkUserId: undefined });

    return {
      clerkUserId: open.clerkUserId,
      deleteAccount: open.accountCreatedByInvite,
    };
  },
});
