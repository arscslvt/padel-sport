import { v } from "convex/values";

import { internal } from "../../_generated/api";
import type { Doc, Id } from "../../_generated/dataModel";
import type { ActionCtx } from "../../_generated/server";
import {
  clubAction,
  internalAction,
  internalMutation,
  internalQuery,
} from "../../functions";
import { formatClubDateTime } from "../../utils/clubTime";
import { staffBookingUrl } from "../../utils/staffLinks";
import { getIdentityPlayer, requirePlayer } from "../openMatches/lib";
import { bookingChanged } from "../points/auto";
import { bookingTotal, formatEuro } from "../pricing/lib";
import {
  bookingByCode,
  CHECKOUT_SESSION_MS,
  isOpen,
  onlinePaymentsActive,
  OPENING_GRACE_MS,
  type PaymentStatus,
  payBlocker,
  REUSE_MARGIN_MS,
  SETTLE_DELAY_MS,
  statusFromCheckout,
} from "./lib";
import {
  createCheckout,
  deactivateCheckout,
  getCheckout,
  snapshot,
  sumupConfig,
} from "./sumup";

/**
 * Il pagamento online di una prenotazione, dalla pagina di SumUp all'esito.
 *
 * 1. `start` apre il tentativo e crea la Hosted Checkout: il cliente paga
 *    sulla pagina di SumUp, non qui, e nessun dato della carta passa da noi.
 * 2. SumUp chiama `/webhooks/sumup` (http.ts) a ogni cambio di stato. Il
 *    webhook non è firmato e dice solo *quale* checkout è cambiato: l'esito
 *    vero lo rilegge sempre `settle` dall'API, con la nostra chiave.
 * 3. Due reti di sicurezza se il webhook si perde: `refresh`, che la pagina
 *    della prenotazione chiama quando il cliente torna da SumUp, e una
 *    rilettura programmata appena la pagina di pagamento scade.
 *
 * L'importo lo decide il server, mai il browser: la squadra della
 * prenotazione al prezzo con cui è nata (modules/pricing/lib.ts).
 *
 * Dal browser la prenotazione si indica col codice, come fa la sua pagina
 * pubblica: l'id resta sul server. Il controllo sul titolare c'è comunque in
 * ogni funzione, perché il codice sta anche nel QR.
 */

const DEFAULT_SITE_URL = "https://asdpadelsport.com";

const checkoutStatus = v.union(
  v.literal("PENDING"),
  v.literal("FAILED"),
  v.literal("PAID"),
  v.literal("EXPIRED"),
);

type Opened =
  | { kind: "reuse"; url: string }
  | {
      kind: "new";
      paymentId: Id<"payments">;
      amount: number;
      expiresAt: number;
      code: string;
      description: string;
      /** Checkout ancora aperti da chiudere su SumUp prima di crearne uno. */
      superseded: string[];
    };

/**
 * Apre un tentativo, o restituisce la pagina di quello ancora valido.
 *
 * Sta in una mutation perché controllo e scrittura devono essere una cosa
 * sola: due tocchi su «Paga ora» non devono produrre due pagine di pagamento.
 */
export const open = internalMutation({
  args: { code: v.string(), clubId: v.id("clubs") },
  handler: async (ctx, { code, clubId }): Promise<Opened> => {
    // L'interruttore del club si controlla qui, dentro la stessa transazione
    // che apre il tentativo: nascondere il pulsante non basta, la funzione si
    // può chiamare anche senza passare dal sito.
    if (!(await onlinePaymentsActive(ctx, clubId))) {
      throw new Error(
        "Il pagamento online non è attivo: puoi pagare in struttura.",
      );
    }

    const player = await requirePlayer(ctx);
    const booking = await bookingByCode(ctx, code);

    // Quella di un altro si comporta come una prenotazione che non c'è: dire
    // «non è tua» confermerebbe che esiste.
    if (!booking || booking.createdByPlayer !== player._id || !booking.code) {
      throw new Error("Prenotazione non trovata.");
    }

    const now = Date.now();
    const blocker = payBlocker(booking, now);
    if (blocker) throw new Error(blocker);

    const amount = bookingTotal(booking);
    if (amount <= 0) {
      throw new Error("Questa prenotazione non ha un importo da pagare.");
    }

    const attempts = await ctx.db
      .query("payments")
      .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
      .collect();

    if (attempts.some((attempt) => attempt.status === "paid")) {
      throw new Error("La prenotazione è già pagata.");
    }

    const opening = attempts.find(
      (attempt) =>
        attempt.status === "pending" &&
        !attempt.checkoutId &&
        now - attempt.createdAt < OPENING_GRACE_MS,
    );
    if (opening) {
      throw new Error(
        "Stiamo già aprendo la pagina di pagamento: riprova fra qualche secondo.",
      );
    }

    // Stessa squadra, stessa cifra, pagina ancora lontana dalla scadenza: si
    // torna su quella. Se la squadra è cambiata l'importo non è più giusto.
    const reusable = attempts.find(
      (attempt) =>
        isOpen(attempt, now) &&
        attempt.amount === amount &&
        attempt.expiresAt - now > REUSE_MARGIN_MS,
    );
    if (reusable?.checkoutUrl) {
      return { kind: "reuse", url: reusable.checkoutUrl };
    }

    // Quel che resta in attesa si chiude: un tentativo alla volta. Se il
    // cliente ne avesse pagato uno proprio adesso, l'esito arriva lo stesso e
    // `apply` lo registra (e chiede il rimborso del doppio).
    const superseded: string[] = [];
    for (const attempt of attempts) {
      if (attempt.status !== "pending") continue;

      await ctx.db.patch(attempt._id, {
        status: "expired",
        error: "Sostituito da un nuovo tentativo.",
        updatedAt: now,
      });
      if (attempt.checkoutId) superseded.push(attempt.checkoutId);
    }

    const expiresAt = now + CHECKOUT_SESSION_MS;
    const paymentId = await ctx.db.insert("payments", {
      clubId: booking.clubId,
      bookingId: booking._id,
      playerId: player._id,
      provider: "sumup",
      amount,
      currency: "EUR",
      status: "pending",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    });

    return {
      kind: "new",
      paymentId,
      amount,
      expiresAt,
      code: booking.code,
      description: `Prenotazione ${booking.code} · ${formatClubDateTime(booking.bookingDate)}`,
      superseded,
    };
  },
});

export const attach = internalMutation({
  args: {
    paymentId: v.id("payments"),
    checkoutId: v.string(),
    checkoutUrl: v.string(),
  },
  handler: async (ctx, { paymentId, checkoutId, checkoutUrl }) => {
    const payment = await ctx.db.get(paymentId);
    if (!payment) return;

    await ctx.db.patch(paymentId, {
      checkoutId,
      checkoutUrl,
      updatedAt: Date.now(),
    });

    // Se il webhook non arriva, l'esito lo andiamo a prendere noi.
    await ctx.scheduler.runAt(
      payment.expiresAt + SETTLE_DELAY_MS,
      internal.modules.payments.checkout.sync,
      { paymentId },
    );
  },
});

/** Il checkout non si è potuto creare: il tentativo si chiude subito. */
export const abandon = internalMutation({
  args: { paymentId: v.id("payments"), error: v.string() },
  handler: async (ctx, { paymentId, error }) => {
    const payment = await ctx.db.get(paymentId);
    if (payment?.status !== "pending") return;

    await ctx.db.patch(paymentId, {
      status: "failed",
      error: error.slice(0, 500),
      updatedAt: Date.now(),
    });
  },
});

/**
 * Manda il cliente a pagare: restituisce l'indirizzo della pagina di SumUp.
 *
 * Il browser ci va con un redirect; quando il cliente torna, la pagina della
 * prenotazione chiama `refresh`.
 */
export const start = clubAction({
  args: { code: v.string() },
  handler: async (ctx, { code }): Promise<{ url: string }> => {
    const config = sumupConfig();
    if (!config) {
      throw new Error(
        "Il pagamento online non è attivo: puoi pagare in struttura.",
      );
    }

    const opened: Opened = await ctx.runMutation(
      internal.modules.payments.checkout.open,
      { code, clubId: ctx.club._id },
    );
    if (opened.kind === "reuse") return { url: opened.url };

    // Le pagine sostituite si chiudono anche su SumUp. Se non riesce, scadono
    // comunque da sole entro mezz'ora: non vale la pena fermare il cliente.
    await Promise.all(
      opened.superseded.map((checkoutId) =>
        deactivateCheckout(config, checkoutId).catch((error) => {
          console.warn("Checkout sostituito non disattivato:", checkoutId, error);
        }),
      ),
    );

    const siteUrl = (process.env.SITE_URL ?? DEFAULT_SITE_URL).replace(
      /\/+$/,
      "",
    );

    try {
      const checkout = await createCheckout(config, {
        reference: opened.paymentId,
        amount: opened.amount,
        description: opened.description,
        webhookUrl: `${process.env.CONVEX_SITE_URL}/webhooks/sumup`,
        redirectUrl: `${siteUrl}/booking/${opened.code}?pagamento=esito`,
        validUntil: opened.expiresAt,
      });

      if (!checkout.hosted_checkout_url) {
        throw new Error("SumUp non ha restituito la pagina di pagamento.");
      }

      await ctx.runMutation(internal.modules.payments.checkout.attach, {
        paymentId: opened.paymentId,
        checkoutId: checkout.id,
        checkoutUrl: checkout.hosted_checkout_url,
      });

      return { url: checkout.hosted_checkout_url };
    } catch (error) {
      console.error("Checkout SumUp non creato:", error);
      await ctx.runMutation(internal.modules.payments.checkout.abandon, {
        paymentId: opened.paymentId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new Error(
        "Il pagamento online non è disponibile in questo momento. Riprova fra poco, o paga in struttura.",
      );
    }
  },
});

export const byId = internalQuery({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, { paymentId }) => await ctx.db.get(paymentId),
});

export const byCheckout = internalQuery({
  args: { checkoutId: v.string() },
  handler: async (ctx, { checkoutId }) =>
    await ctx.db
      .query("payments")
      .withIndex("by_checkout", (q) => q.eq("checkoutId", checkoutId))
      .unique(),
});

/** I tentativi della prenotazione, solo se chi chiede ne è il titolare. */
export const ownAttempts = internalQuery({
  args: { code: v.string() },
  handler: async (ctx, { code }) => {
    const player = await getIdentityPlayer(ctx);
    const booking = await bookingByCode(ctx, code);
    if (!player || !booking || booking.createdByPlayer !== player._id) {
      return [];
    }

    const attempts = await ctx.db
      .query("payments")
      .withIndex("by_booking", (q) => q.eq("bookingId", booking._id))
      .collect();

    return attempts.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Rilegge l'esito da SumUp e lo registra. Un pagamento già incassato non si
 * rilegge; uno chiuso male sì, perché un tentativo sostituito può comunque
 * essere stato pagato all'ultimo secondo.
 */
async function settle(
  ctx: ActionCtx,
  payment: Doc<"payments"> | null,
): Promise<PaymentStatus | null> {
  if (!payment) return null;
  // Incassato o già restituito: SumUp continuerebbe a dire PAID, e rileggerlo
  // farebbe tornare «pagato» un pagamento rimborsato.
  if (
    !payment.checkoutId ||
    payment.status === "paid" ||
    payment.status === "refunded"
  ) {
    return payment.status;
  }

  const config = sumupConfig();
  if (!config) return payment.status;

  const checkout = await getCheckout(config, payment.checkoutId);

  return await ctx.runMutation(internal.modules.payments.checkout.apply, {
    paymentId: payment._id,
    ...snapshot(checkout),
  });
}

/** La rilettura programmata a pagina scaduta. */
export const sync = internalAction({
  args: { paymentId: v.id("payments") },
  handler: async (ctx, { paymentId }): Promise<void> => {
    const payment = await ctx.runQuery(internal.modules.payments.checkout.byId, {
      paymentId,
    });
    await settle(ctx, payment);
  },
});

/**
 * Il webhook: SumUp dice quale checkout è cambiato. Un id che non è nostro si
 * ignora senza chiamare SumUp, così un webhook falso non costa niente.
 */
export const syncCheckout = internalAction({
  args: { checkoutId: v.string() },
  handler: async (ctx, { checkoutId }): Promise<void> => {
    const payment = await ctx.runQuery(
      internal.modules.payments.checkout.byCheckout,
      { checkoutId },
    );

    if (!payment) {
      console.warn("Webhook SumUp per un checkout sconosciuto:", checkoutId);
      return;
    }

    await settle(ctx, payment);
  },
});

/**
 * Il cliente è tornato da SumUp: l'esito si rilegge subito, senza aspettare il
 * webhook. Restituisce lo stato dell'ultimo tentativo.
 */
export const refresh = clubAction({
  args: { code: v.string() },
  handler: async (ctx, { code }): Promise<PaymentStatus | null> => {
    const attempts: Doc<"payments">[] = await ctx.runQuery(
      internal.modules.payments.checkout.ownAttempts,
      { code },
    );

    const latest = attempts.find((attempt) => attempt.checkoutId);
    if (!latest) return null;

    return await settle(ctx, latest);
  },
});

/**
 * Registra l'esito letto da SumUp: sul tentativo e, se è un incasso, sulla
 * prenotazione, con l'avviso allo staff.
 *
 * Un incasso si registra sempre, anche su un tentativo che per noi era chiuso:
 * i soldi sono arrivati, e nasconderlo vorrebbe dire non rimborsarli mai.
 * Quando l'incasso non torna — prenotazione annullata, già pagata, importo
 * diverso — l'avviso lo dice, perché va sistemato a mano.
 */
export const apply = internalMutation({
  args: {
    paymentId: v.id("payments"),
    status: checkoutStatus,
    amount: v.number(),
    currency: v.string(),
    transactionId: v.optional(v.string()),
    transactionCode: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<PaymentStatus | null> => {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) return null;
    if (payment.status === "paid" || payment.status === "refunded") {
      return payment.status;
    }

    const now = Date.now();
    const next = statusFromCheckout(args.status);

    if (next === "pending") {
      // SumUp può darlo ancora aperto anche a pagina scaduta: per noi è chiuso.
      if (
        payment.status === "pending" &&
        now > payment.expiresAt + SETTLE_DELAY_MS
      ) {
        await ctx.db.patch(payment._id, { status: "expired", updatedAt: now });
        return "expired";
      }
      return payment.status;
    }

    if (next !== "paid") {
      if (payment.status !== "pending") return payment.status;

      await ctx.db.patch(payment._id, { status: next, updatedAt: now });
      return next;
    }

    await ctx.db.patch(payment._id, {
      status: "paid",
      paidAt: now,
      transactionId: args.transactionId,
      transactionCode: args.transactionCode,
      updatedAt: now,
    });

    const booking = await ctx.db.get(payment.bookingId);
    if (!booking) return "paid";

    const alreadyPaid = booking.paymentMode === "online";
    const amountMatches =
      args.currency === payment.currency &&
      Math.abs(args.amount - payment.amount) < 0.005;

    if (!alreadyPaid) {
      await ctx.db.patch(booking._id, {
        paymentMode: "online",
        paidAmount: args.amount,
      });
      await bookingChanged(ctx, booking._id);
    }

    const when = formatClubDateTime(booking.bookingDate);
    const paid = `${booking.bookedBy} ha pagato ${formatEuro(args.amount)} per il ${when}`;

    const problem =
      booking.status === "cancelled"
        ? `${paid}, ma la prenotazione è annullata: va rimborsato dal pannello SumUp.`
        : alreadyPaid
          ? `${paid}, ma la prenotazione era già pagata: il doppio va rimborsato dal pannello SumUp.`
          : !amountMatches
            ? `${paid}, ma l'importo atteso era ${formatEuro(payment.amount)}: controlla nel pannello SumUp.`
            : null;

    await ctx.scheduler.runAfter(
      0,
      internal.modules.notifications.alert.default,
      {
        category: "payments",
        title: problem
          ? "Pagamento online da verificare"
          : "Prenotazione pagata online",
        message: problem ?? `${paid}. Resta da confermare come sempre.`,
        url: staffBookingUrl(booking._id),
        idempotencyKey: `payment-${payment._id}`,
      },
    );

    return "paid";
  },
});
