import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage, staffClerkUserIds } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Eliminazione dell'account di un cliente: avviata (POST), subito o con i
 * trenta giorni per ripensarci, oppure annullata (DELETE). Solo staff.
 *
 * Il resto lo fa Convex (modules/clients/deletion.ts): congela la scheda e
 * chiede al sito di cancellare l'utente Clerk e di scrivere alla persona.
 */

const bodySchema = z.object({ mode: z.enum(["now", "scheduled"]) });

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

  const client = await gate.convex
    .query(api.modules.clients.list.detail, {
      secret: gate.secret,
      playerId: playerId as Id<"players">,
    })
    .catch(() => null);
  if (!client) {
    return NextResponse.json({ error: "Scheda non trovata." }, { status: 404 });
  }

  // Eliminare chi lavora al club gli chiuderebbe anche la dashboard: si toglie
  // prima dall'organizzazione, se è davvero quello che si vuole.
  if (
    client.clerkUserId &&
    (client.clerkUserId === gate.userId ||
      (await staffClerkUserIds()).includes(client.clerkUserId))
  ) {
    return NextResponse.json(
      { error: "Questo è un account dello staff: non si elimina da qui." },
      { status: 400 },
    );
  }

  try {
    const result = await gate.convex.mutation(
      api.modules.clients.deletion.request,
      {
        secret: gate.secret,
        playerId: playerId as Id<"players">,
        mode: parsed.data.mode,
        staffClerkUserId: gate.userId,
      },
    );
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("Eliminazione non avviata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a eliminare l'account.") },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;

  try {
    await gate.convex.mutation(api.modules.clients.deletion.cancel, {
      secret: gate.secret,
      playerId: playerId as Id<"players">,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Eliminazione non annullata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad annullare.") },
      { status: 400 },
    );
  }
}
