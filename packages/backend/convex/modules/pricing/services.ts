import { v } from "convex/values";

import { mutation, query } from "../../_generated/server";
import { serviceKind } from "../../tables/services";
import { assertServer } from "../../utils/serverSecret";
import { defaultClubId } from "../clubs/lib";
import { getIdentityPlayer } from "../openMatches/lib";
import {
  isWholeCents,
  MAX_PRICE,
  matchPricing,
  priceList,
  SERVICE_CATALOG,
} from "./lib";

/**
 * Il listino dei servizi prenotabili.
 *
 * La lettura è pubblica: sono i prezzi del club, li vede chiunque prenoti. La
 * scrittura passa dal segreto condiviso con la dashboard, come la
 * configurazione della prenotazione (modules/settings/booking.ts): chi è
 * staff lo sa Clerk, e il controllo vero sta nella route
 * (app/api/dashboard/prices).
 */

export const list = query({
  args: {},
  handler: async (ctx) => await priceList(ctx),
});

/**
 * Quanto pagherebbe chi sta prenotando: la stessa regola che userà la
 * prenotazione (`matchPricing`), così il riepilogo non promette un prezzo e
 * la prenotazione ne scrive un altro.
 */
export const quote = query({
  args: {},
  handler: async (ctx) => {
    const player = await getIdentityPlayer(ctx);
    return await matchPricing(ctx, player?._id);
  },
});

function checkPrice(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0 || value > MAX_PRICE) {
    throw new Error(`${label}: indica un importo fra 0,01 e ${MAX_PRICE} €.`);
  }

  if (!isWholeCents(value)) {
    throw new Error(`${label}: al massimo due decimali.`);
  }
}

export const save = mutation({
  args: {
    secret: v.string(),
    kind: serviceKind,
    price: v.number(),
    /** Assente: niente tariffa tesserati, pagano tutti `price`. */
    memberPrice: v.optional(v.number()),
  },
  handler: async (ctx, { secret, kind, price, memberPrice }) => {
    assertServer(secret);

    if (!SERVICE_CATALOG[kind]) {
      throw new Error("Servizio sconosciuto.");
    }

    checkPrice(price, "Prezzo");

    if (memberPrice !== undefined) {
      checkPrice(memberPrice, "Prezzo tesserati");

      if (memberPrice > price) {
        throw new Error(
          "Il prezzo tesserati non può superare il prezzo pieno.",
        );
      }
    }

    const existing = await ctx.db
      .query("services")
      .withIndex("by_kind", (q) => q.eq("kind", kind))
      .first();

    if (existing) {
      // `undefined` toglie il campo: è così che si spegne la tariffa tesserati.
      await ctx.db.patch(existing._id, {
        price,
        memberPrice,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("services", {
      clubId: await defaultClubId(ctx),
      kind,
      price,
      memberPrice,
      updatedAt: Date.now(),
    });
  },
});
