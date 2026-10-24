import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * L'agenda della struttura: leggerla, accettare una prenotazione, annullarla.
 *
 * Passa da qui e non da `useQuery` nel browser perché sono dati e azioni della
 * struttura: nomi e telefoni dei clienti da una parte, conferme e disdette
 * dall'altra. Il deployment Convex ha un URL pubblico — sta nel bundle del
 * sito — quindi «lo chiama solo la dashboard» non è mai stata una protezione.
 */

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const params = new URL(request.url).searchParams;
  const includePast = params.get("includePast") === "true";
  // L'agenda: da stamattina, con le partite di oggi in corso e concluse.
  const fromToday = params.get("from") === "today";
  // Un giorno solo, anche passato: `from` e `to` in millisecondi.
  const rangeFrom = Number(params.get("from"));
  const rangeTo = Number(params.get("to"));
  const range =
    Number.isFinite(rangeFrom) &&
    Number.isFinite(rangeTo) &&
    rangeTo > rangeFrom
      ? { from: rangeFrom, to: rangeTo }
      : {};

  try {
    const bookings = await gate.convex.query(api.bookings.list.default, {
      secret: gate.secret,
      includePast,
      fromToday,
      ...range,
      // Con gli avvisi al cliente: la scheda dice se la conferma è arrivata.
      withDeliveries: true,
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Prenotazioni non recuperate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere le prenotazioni.") },
      { status: 502 },
    );
  }
}

const acceptSchema = z.object({
  bookingId: z.string().min(1),
  withNotification: z.boolean().optional(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = acceptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.bookings.update.accept, {
      secret: gate.secret,
      bookingId: parsed.data.bookingId as Id<"bookings">,
      withNotification: parsed.data.withNotification,
    });

    return NextResponse.json({ accepted: true });
  } catch (error) {
    console.error("Prenotazione non accettata:", error);
    return NextResponse.json(
      {
        error: convexMessage(error, "Non riesco ad accettare la prenotazione."),
      },
      { status: 400 },
    );
  }
}

const deleteSchema = z.object({
  bookingId: z.string().min(1),
  /** La spunta «Rimborsa il pagamento online» della modale di annullamento. */
  refund: z.boolean().optional(),
});

export async function DELETE(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const bookingId = parsed.data.bookingId as Id<"bookings">;

  try {
    await gate.convex.mutation(api.bookings.delete.default, {
      secret: gate.secret,
      bookingId,
    });
  } catch (error) {
    console.error("Prenotazione non annullata:", error);
    return NextResponse.json(
      {
        error: convexMessage(error, "Non riesco ad annullare la prenotazione."),
      },
      { status: 400 },
    );
  }

  if (!parsed.data.refund) return NextResponse.json({ cancelled: true });

  // Prima si annulla, poi si rimborsa: un rimborso fallito lascia una
  // prenotazione annullata e «da rimborsare», che si riprova dalla scheda. Al
  // contrario resterebbe una prenotazione attiva con i soldi già restituiti.
  try {
    const refund = await gate.convex.action(
      api.modules.payments.refund.default,
      { secret: gate.secret, bookingId, staffUserId: gate.userId },
    );

    return NextResponse.json({ cancelled: true, refund });
  } catch (error) {
    console.error("Rimborso all'annullamento non riuscito:", error);
    return NextResponse.json({
      cancelled: true,
      refund: {
        refunded: 0,
        amount: 0,
        failed: [convexMessage(error, "Il rimborso non è riuscito.")],
      },
    });
  }
}
