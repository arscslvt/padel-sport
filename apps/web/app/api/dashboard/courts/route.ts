import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { staffGate } from "@/lib/dashboard-api";

/** Crea o aggiorna un campo. Solo staff. */

const bodySchema = z.object({
  courtId: z.string().optional(),
  name: z.string().min(2).max(40),
  description: z.string().max(200).optional(),
  active: z.boolean(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { courtId, ...court } = parsed.data;

  try {
    await gate.convex.mutation(api.modules.settings.booking.saveCourt, {
      secret: gate.secret,
      courtId: courtId ? (courtId as Id<"slots">) : undefined,
      ...court,
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Salvataggio del campo fallito:", error);
    const message =
      error instanceof Error
        ? (error.message.match(/Uncaught Error: (.*?)(?:\n| at )/)?.[1] ??
          "Non riesco a salvare il campo.")
        : "Non riesco a salvare il campo.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
