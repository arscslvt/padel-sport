import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Segna se il cliente era già del club prima di avere la scheda: decide se gli
 * spetta «Prima partita». Solo staff.
 */

const bodySchema = z.object({ existingClient: z.boolean() });

export async function PUT(
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
    const result = await gate.convex.mutation(
      api.modules.points.ledger.setExistingClient,
      {
        ...gate.credentials,
        playerId: playerId as Id<"players">,
        existingClient: parsed.data.existingClient,
      },
    );

    return NextResponse.json({ saved: true, ...result });
  } catch (error) {
    console.error("Stato di cliente già esistente non salvato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare.") },
      { status: 400 },
    );
  }
}
