import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * I giocatori di una prenotazione: leggerli per il modulo di modifica e
 * salvarli. Solo staff. Le regole — chi è bloccato, quanti posti — stanno in
 * Convex (bookings/players.ts).
 */

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const bookingId = new URL(request.url).searchParams.get("bookingId");
  if (!bookingId) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const players = await gate.convex.query(api.bookings.players.forEdit, {
      ...gate.credentials,
      bookingId: bookingId as Id<"bookings">,
    });

    return NextResponse.json(players);
  } catch (error) {
    console.error("Giocatori non recuperati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere i giocatori.") },
      { status: 502 },
    );
  }
}

const bodySchema = z.object({
  bookingId: z.string().min(1),
  players: z.array(z.string().max(60)).min(1).max(4),
  /** I nomi collegati a un cliente in anagrafica. */
  links: z
    .array(z.object({ name: z.string().max(60), playerId: z.string().min(1) }))
    .max(4)
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
    const result = await gate.convex.mutation(api.bookings.players.update, {
      ...gate.credentials,
      bookingId: parsed.data.bookingId as Id<"bookings">,
      players: parsed.data.players,
      links: parsed.data.links?.map((link) => ({
        name: link.name,
        playerId: link.playerId as Id<"players">,
      })),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Giocatori non salvati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare i giocatori.") },
      { status: 400 },
    );
  }
}
