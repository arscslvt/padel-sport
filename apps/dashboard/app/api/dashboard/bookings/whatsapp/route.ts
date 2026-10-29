import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Il WhatsApp di conferma rimandato dalla scheda della prenotazione, con il
 * numero eventualmente corretto. Solo staff. Le regole stanno in Convex
 * (bookings/whatsapp.ts).
 */

const bodySchema = z.object({
  bookingId: z.string().min(1),
  phone: z.string().trim().min(1).max(30),
  /** Un giocatore della prenotazione invece di chi l'ha presa. */
  playerId: z.string().min(1).optional(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(api.bookings.whatsapp.resend, {
      ...gate.credentials,
      bookingId: parsed.data.bookingId as Id<"bookings">,
      phone: parsed.data.phone,
      playerId: parsed.data.playerId as Id<"players"> | undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("WhatsApp non rimandato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Impossibile rimandare il WhatsApp.") },
      { status: 400 },
    );
  }
}
