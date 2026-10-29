import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Rimborsa un pagamento online dalla scheda della prenotazione: dopo
 * l'annullamento, o su una prenotazione confermata. Solo staff.
 *
 * Il rimborso al momento dell'annullamento passa invece dalla stessa route
 * che annulla (api/dashboard/bookings), con `refund: true`.
 */

const bodySchema = z.object({
  bookingId: z.string().min(1),
  /** Uno solo, per esempio il doppione; senza, tutti quelli incassati. */
  paymentId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const outcome = await gate.convex.action(
      api.modules.payments.refund.default,
      {
        ...gate.credentials,
        bookingId: parsed.data.bookingId as Id<"bookings">,
        paymentId: parsed.data.paymentId as Id<"payments"> | undefined,
        staffUserId: gate.userId,
      },
    );

    if (outcome.refunded === 0) {
      return NextResponse.json(
        {
          error: outcome.failed[0] ?? "Il rimborso non è riuscito.",
          outcome,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({ outcome });
  } catch (error) {
    console.error("Rimborso non riuscito:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a rimborsare il pagamento.") },
      { status: 400 },
    );
  }
}
