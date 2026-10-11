import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Registra l'adesione al programma punti firmata allo sportello. Solo staff.
 * Il modulo cartaceo va conservato dal club: è quello la prova dell'adesione.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;

  try {
    const result = await gate.convex.mutation(
      api.modules.points.terms.recordAtDesk,
      {
        secret: gate.secret,
        playerId: playerId as Id<"players">,
        recordedByClerkUserId: gate.userId,
      },
    );

    return NextResponse.json({ recorded: true, ...result });
  } catch (error) {
    console.error("Adesione al programma non registrata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a registrare l'adesione.") },
      { status: 400 },
    );
  }
}
