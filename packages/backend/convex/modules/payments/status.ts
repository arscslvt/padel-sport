import { v } from "convex/values";

import { query } from "../../_generated/server";
import { getIdentityPlayer } from "../openMatches/lib";
import { bookingTotal } from "../pricing/lib";
import { bookingSettings } from "../settings/lib";
import {
  bookingByCode,
  isOpen,
  onlinePaymentsActive,
  payBlocker,
} from "./lib";
import { sumupConfig } from "./sumup";

/**
 * Il club ha attivato il pagamento online: decide se il modulo di
 * prenotazione propone la scelta «online adesso / in struttura».
 */
export const enabled = query({
  args: {},
  handler: async (ctx) => await onlinePaymentsActive(ctx),
});

/**
 * Lo stato dei due interruttori, per il gestionale: se l'interruttore del
 * club è acceso ma le chiavi mancano, la dashboard deve poterlo dire invece di
 * lasciar credere che i clienti stiano pagando online.
 */
export const setup = query({
  args: {},
  handler: async (ctx) => ({
    configured: sumupConfig() !== null,
    enabled: (await bookingSettings(ctx)).onlinePaymentsEnabled,
  }),
});

/**
 * Il pagamento di una prenotazione visto dal suo titolare: se può pagare
 * online, quanto, e com'è andato l'ultimo tentativo.
 *
 * Per chiunque altro restituisce `null`: la pagina della prenotazione è
 * pubblica (ci si arriva dal QR), il pulsante «Paga ora» no.
 */
export const forCode = query({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const player = await getIdentityPlayer(ctx);
    const booking = await bookingByCode(ctx, code);
    if (!player || !booking || booking.createdByPlayer !== player._id) {
      return null;
    }

    const now = Date.now();
    const attempts = (
      await ctx.db
        .query("payments")
        .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
        .collect()
    ).sort((a, b) => b.createdAt - a.createdAt);

    const paid = attempts.find((attempt) => attempt.status === "paid");
    const latest = attempts[0];
    const enabled = await onlinePaymentsActive(ctx);
    const blocker = payBlocker(booking, now);

    return {
      /** Il club ha attivato il pagamento online. */
      enabled,
      /** Quanto si paga adesso, o quanto si è pagato. */
      amount: paid?.amount ?? bookingTotal(booking),
      canPay: enabled && blocker === null && !paid,
      /** Perché non si può pagare, da dire al cliente. */
      blocker: enabled && !paid ? blocker : null,
      paid: paid
        ? {
            amount: paid.amount,
            paidAt: paid.paidAt ?? paid.updatedAt,
            transactionCode: paid.transactionCode,
          }
        : null,
      /** L'ultimo tentativo: per dire «non è andato a buon fine» o «riprendi». */
      latest: latest
        ? { status: latest.status, open: isOpen(latest, now) }
        : null,
    };
  },
});
