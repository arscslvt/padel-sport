import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * La mail di conferma rimandata dalla scheda della prenotazione, a chi non
 * l'ha ricevuta. Solo staff. Le regole stanno in Convex (bookings/email.ts).
 */

const bodySchema = z.object({
  bookingId: z.string().min(1),
  /** Una persona sola; senza, tutti quelli che la aspettano. */
  target: z
    .discriminatedUnion("role", [
      z.object({ role: z.literal("booker") }),
      z.object({ role: z.literal("player"), playerId: z.string().min(1) }),
      z.object({ role: z.literal("guest"), email: z.string().min(1) }),
    ])
    .optional(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(api.bookings.email.resend, {
      ...gate.credentials,
      bookingId: parsed.data.bookingId as Id<"bookings">,
      target: parsed.data.target as
        | { role: "booker" }
        | { role: "player"; playerId: Id<"players"> }
        | { role: "guest"; email: string }
        | undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Mail non rimandata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Impossibile rimandare la mail.") },
      { status: 400 },
    );
  }
}
