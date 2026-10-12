import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Il campo di una prenotazione: quali si possono scegliere e lo spostamento.
 * Solo staff. Le regole stanno in Convex (bookings/court.ts).
 */

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const bookingId = new URL(request.url).searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const options = await gate.convex.query(api.bookings.court.options, {
      secret: gate.secret,
      bookingId: bookingId as Id<"bookings">,
    });

    return NextResponse.json(options);
  } catch (error) {
    console.error("Campi non recuperati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Impossibile caricare i campi.") },
      { status: 502 },
    );
  }
}

const bodySchema = z.object({
  bookingId: z.string().min(1),
  slotId: z.string().min(1),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(api.bookings.court.move, {
      secret: gate.secret,
      bookingId: parsed.data.bookingId as Id<"bookings">,
      slotId: parsed.data.slotId as Id<"slots">,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Campo non cambiato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Impossibile cambiare il campo.") },
      { status: 400 },
    );
  }
}
