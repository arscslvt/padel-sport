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
 *
 * I due moduli si validano separatamente: con un'unione zod l'errore sarebbe
 * sempre quello generico, e un motivo troppo lungo diventerebbe «scegli un
 * preset», che non dice cosa correggere.
 */

const noteSchema = z
  .string()
  .trim()
  .max(300, "La nota può avere al massimo 300 caratteri.")
  .optional();

const presetSchema = z.object({
  presetId: z.string(),
  note: noteSchema,
});

const manualSchema = z.object({
  delta: z
    .number("Indica quanti punti.")
    .int("I punti devono essere un numero intero.")
    .min(-1000, "Un singolo movimento non può superare 1000 punti.")
    .max(1000, "Un singolo movimento non può superare 1000 punti.")
    .refine((value) => value !== 0, "I punti non possono essere zero."),
  label: z
    .string("Scrivi il motivo del movimento.")
    .trim()
    .min(2, "Scrivi il motivo del movimento.")
    .max(200, "Il motivo può avere al massimo 200 caratteri."),
  note: noteSchema,
});

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
  const raw = await request.json().catch(() => null);
  const fromPreset =
    typeof raw === "object" && raw !== null && "presetId" in raw;
  const parsed = (fromPreset ? presetSchema : manualSchema).safeParse(raw);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Scegli un preset, oppure indica punti e motivo.",
      },
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
