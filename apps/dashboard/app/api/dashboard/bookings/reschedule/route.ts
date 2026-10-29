import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Il cambio d'orario di una prenotazione, nello stesso giorno: gli orari che
 * si possono scegliere e lo spostamento. Solo staff. Le regole — fasce di
 * apertura, campi liberi, SumUp — stanno in Convex (bookings/reschedule.ts).
 */

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const bookingId = new URL(request.url).searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const options = await gate.convex.query(api.bookings.reschedule.options, {
      ...gate.credentials,
      bookingId: bookingId as Id<"bookings">,
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error("Orari non recuperati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere gli orari liberi.") },
      { status: 502 },
    );
  }
}

const bodySchema = z.object({
  bookingId: z.string().min(1),
  bookingDate: z.number(),
  notify: z.boolean(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(api.bookings.reschedule.move, {
      ...gate.credentials,
      bookingId: parsed.data.bookingId as Id<"bookings">,
      bookingDate: parsed.data.bookingDate,
      notify: parsed.data.notify,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Orario non spostato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a spostare l'orario.") },
      { status: 400 },
    );
  }
}
