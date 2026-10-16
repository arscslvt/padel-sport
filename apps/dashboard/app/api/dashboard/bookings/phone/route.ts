import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Il numero di chi ha prenotato, scritto o corretto dalla scheda. Solo staff.
 * Le regole stanno in Convex (bookings/contact.ts).
 */

const bodySchema = z.object({
  bookingId: z.string().min(1),
  phone: z.string().trim().min(1).max(30),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(
      api.bookings.contact.updatePhone,
      {
        secret: gate.secret,
        bookingId: parsed.data.bookingId as Id<"bookings">,
        phone: parsed.data.phone,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Telefono non salvato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Impossibile salvare il numero.") },
      { status: 400 },
    );
  }
}
