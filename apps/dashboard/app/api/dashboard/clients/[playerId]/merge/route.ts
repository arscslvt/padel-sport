import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Unisce questa scheda, un doppione, a quella da tenere: prenotazioni,
 * tessere e (se richiesto) punti passano di là, e questa sparisce. Solo staff.
 */

const bodySchema = z.object({
  intoId: z.string().min(1),
  points: z.enum(["move", "drop"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(api.modules.clients.merge.merge, {
      secret: gate.secret,
      fromId: playerId as Id<"players">,
      intoId: parsed.data.intoId as Id<"players">,
      points: parsed.data.points,
    });

    return NextResponse.json({ merged: true, ...result });
  } catch (error) {
    console.error("Schede non unite:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a unire le schede.") },
      { status: 400 },
    );
  }
}
