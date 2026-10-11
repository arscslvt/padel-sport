import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Una prenotazione presa dallo staff (bookings/staffCreate.ts). Le regole
 * stanno nella mutation: qui solo la forma dei dati e la verifica di chi
 * chiede.
 */

const createSchema = z.object({
  bookingDate: z.number(),
  slotId: z.string().optional(),
  playerId: z.string().optional(),
  bookedBy: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional(),
  players: z.array(z.string().trim().max(80)).max(4),
  level: z.enum(["principiante", "intermedio", "avanzato"]),
  notify: z.boolean(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Controlla nome, orario e giocatori." },
      { status: 400 },
    );
  }

  const { slotId, playerId, phone, ...rest } = parsed.data;

  try {
    const result = await gate.convex.mutation(
      api.bookings.staffCreate.default,
      {
        secret: gate.secret,
        ...rest,
        phone: phone || undefined,
        slotId: slotId ? (slotId as Id<"slots">) : undefined,
        playerId: playerId ? (playerId as Id<"players">) : undefined,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Prenotazione dello staff non creata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a creare la prenotazione.") },
      { status: 400 },
    );
  }
}
