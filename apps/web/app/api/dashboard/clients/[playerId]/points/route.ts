import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Il conto punti di un cliente: lettura e movimenti. Solo staff.
 *
 * Il movimento è da preset (basta l'id: punti e causale li decide il preset)
 * oppure a mano, con punti e motivo scritti dallo staff.
 */

const bodySchema = z.union([
  z.object({
    presetId: z.string(),
    note: z.string().trim().max(300).optional(),
  }),
  z.object({
    delta: z
      .number()
      .int()
      .min(-1000)
      .max(1000)
      .refine((value) => value !== 0),
    label: z.string().trim().min(2).max(80),
    note: z.string().trim().max(300).optional(),
  }),
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;

  try {
    const points = await gate.convex.query(api.modules.points.ledger.detail, {
      secret: gate.secret,
      playerId: playerId as Id<"players">,
    });

    if (!points) {
      return NextResponse.json(
        { error: "Cliente non trovato." },
        { status: 404 },
      );
    }

    return NextResponse.json({ points });
  } catch (error) {
    console.error("Conto punti non recuperato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere i punti.") },
      { status: 502 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Scegli un preset, oppure indica punti e motivo." },
      { status: 400 },
    );
  }

  const body = parsed.data;

  try {
    const result = await gate.convex.mutation(
      api.modules.points.ledger.adjust,
      {
        secret: gate.secret,
        playerId: playerId as Id<"players">,
        createdByClerkUserId: gate.userId,
        note: body.note || undefined,
        ...("presetId" in body
          ? { presetId: body.presetId as Id<"pointPresets"> }
          : { delta: body.delta, label: body.label }),
      },
    );

    return NextResponse.json({
      saved: true,
      balance: result.balance,
      pending: result.pending,
    });
  } catch (error) {
    console.error("Punti non registrati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a registrare i punti.") },
      { status: 400 },
    );
  }
}
