import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { staffGate } from "@/lib/dashboard-api";

/**
 * Unisce due prenotazioni parziali in un campo solo, o scioglie l'unione.
 * Solo staff: la sessione la verifica `staffGate`, il segreto è la seconda
 * serratura davanti alla mutation (packages/backend/convex/bookings/merge.ts).
 */

const mergeSchema = z.object({
  keepId: z.string().min(1),
  moveId: z.string().min(1),
});

const splitSchema = z.object({
  bookingId: z.string().min(1),
});

/** Il messaggio dentro l'errore Convex, che altrimenti arriva incapsulato. */
function convexMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  return (
    error.message.match(/Uncaught Error: (.*?)(?:\n| at )/)?.[1] ?? fallback
  );
}

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = mergeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(api.bookings.merge.merge, {
      secret: gate.secret,
      keepId: parsed.data.keepId as Id<"bookings">,
      moveId: parsed.data.moveId as Id<"bookings">,
    });

    return NextResponse.json({ merged: true, players: result?.players });
  } catch (error) {
    console.error("Unione delle prenotazioni fallita:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a unire le prenotazioni.") },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = splitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(api.bookings.merge.split, {
      secret: gate.secret,
      bookingId: parsed.data.bookingId as Id<"bookings">,
    });

    return NextResponse.json({ split: true, court: result?.moved });
  } catch (error) {
    console.error("Divisione delle prenotazioni fallita:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a separare le prenotazioni.") },
      { status: 400 },
    );
  }
}
