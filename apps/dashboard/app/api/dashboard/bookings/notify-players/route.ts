import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * La conferma ai giocatori collegati che non l'hanno mai ricevuta. Solo
 * staff. Le regole stanno in Convex (bookings/notifyPlayers.ts).
 */

const bodySchema = z.object({ bookingId: z.string().min(1) });

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(
      api.bookings.notifyPlayers.sendMissing,
      {
        ...gate.credentials,
        bookingId: parsed.data.bookingId as Id<"bookings">,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Conferma ai giocatori non inviata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Impossibile avvisare i giocatori.") },
      { status: 400 },
    );
  }
}
