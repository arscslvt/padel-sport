import { v } from "convex/values";

import type { Doc } from "../../_generated/dataModel";
import { query } from "../../_generated/server";
import { assertServer } from "../../utils/serverSecret";
import {
  accountInfo,
  displayName,
  membershipHistory,
  membershipStatus,
  missingProfileFields,
} from "./lib";

/**
 * L'anagrafica per la dashboard.
 *
 * Protetta dal segreto condiviso, e non per abitudine: qui dentro ci sono
 * telefoni, date di nascita e consensi: una query pubblica su questa tabella
 * sarebbe leggibile da chiunque conosca l'URL del deployment, che è pubblico.
 * Chi è staff lo sa Clerk, e il controllo vero sta nella route che chiama
 * (app/api/dashboard/clients).
 */

function toRow(player: Doc<"players">) {
  return {
    id: player._id,
    clerkUserId: player.clerkUserId,
    name: displayName(player),
    firstName: player.firstName,
    lastName: player.lastName,
    email: player.email,
    phone: player.phone,
    birthDate: player.birthDate,
    birthPlace: player.birthPlace,
    gender: player.gender,
    avatarUrl: player.avatarUrl,
    level: player.level,
    code: player.code,
    consents: player.consents,
    createdAt: player.createdAt,
    missingFields: missingProfileFields(player),
  };
}

/**
 * Elenco dei clienti, con lo stato della tessera.
 *
 * Torna tutti, senza ricerca: l'anagrafica di un circolo sta nelle centinaia di
 * righe, e il filtro vive nella route che chiama. Il motivo non è comodità —
 * è che l'email può stare solo su Clerk (i profili nati dall'app non l'hanno
 * mai scritta qui), e cercare prima di averla completata vorrebbe dire non
 * trovare proprio le persone che si stanno cercando.
 *
 * `excludeClerkUserIds` sono i profili dello staff, che il chiamante conosce e
 * questa tabella no.
 */
export default query({
  args: {
    secret: v.string(),
    excludeClerkUserIds: v.optional(v.array(v.string())),
  },
  handler: async (ctx, { secret, excludeClerkUserIds }) => {
    assertServer(secret);

    const excluded = new Set(excludeClerkUserIds ?? []);

    // Le schede senza account non possono essere di nessuno dello staff.
    const players = (await ctx.db.query("players").collect()).filter(
      (player) => !player.clerkUserId || !excluded.has(player.clerkUserId),
    );

    const now = Date.now();

    const rows = await Promise.all(
      players.map(async (player) => {
        const { state, membership } = await membershipStatus(
          ctx,
          player._id,
          now,
        );

        return {
          ...toRow(player),
          account: await accountInfo(ctx, player),
          membership: membership
            ? {
                id: membership._id,
                startsAt: membership.startsAt,
                endsAt: membership.endsAt,
                paid: membership.paid,
                paidAt: membership.paidAt,
                method: membership.method,
                amount: membership.amount,
              }
            : null,
          membershipState: state,
        };
      }),
    );

    // Prima chi ha bisogno di attenzione: tessera mancante, da pagare o scaduta.
    const priority: Record<string, number> = {
      unpaid: 0,
      expired: 1,
      none: 2,
      expiring: 3,
      active: 4,
    };

    return rows.sort(
      (a, b) =>
        priority[a.membershipState] - priority[b.membershipState] ||
        a.name.localeCompare(b.name),
    );
  },
});

/** La scheda di un cliente, con lo storico delle tessere. */
export const detail = query({
  args: { secret: v.string(), playerId: v.id("players") },
  handler: async (ctx, { secret, playerId }) => {
    assertServer(secret);

    const player = await ctx.db.get(playerId);
    if (!player) return null;

    const history = await membershipHistory(ctx, playerId);
    const { state } = await membershipStatus(ctx, playerId);

    return {
      ...toRow(player),
      account: await accountInfo(ctx, player),
      // Solo in scheda: codice fiscale, dati sanitari e note interne non hanno
      // niente da fare in un elenco che si scorre a video davanti al banco.
      taxCode: player.taxCode,
      residence: player.residence,
      health: player.health,
      clubNotes: player.clubNotes,
      membershipState: state,
      memberships: history.map((row) => ({
        id: row._id,
        startsAt: row.startsAt,
        endsAt: row.endsAt,
        paid: row.paid,
        paidAt: row.paidAt,
        method: row.method,
        amount: row.amount,
        note: row.note,
      })),
    };
  },
});
