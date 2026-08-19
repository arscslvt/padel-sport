import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";
import { z } from "zod";

import { staffGate } from "@/lib/dashboard-api";

/** Salva giorni e fasce in cui si può prenotare. Solo staff. */

const bodySchema = z.object({
  bookableDays: z.number().int().min(1).max(60),
  membershipRequired: z.boolean().optional(),
  windows: z.array(
    z.object({
      weekday: z.number().int().min(0).max(6),
      start: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/),
      end: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/),
    }),
  ),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.modules.settings.booking.update, {
      secret: gate.secret,
      ...parsed.data,
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Salvataggio degli orari fallito:", error);
    const message =
      error instanceof Error
        ? (error.message.match(/Uncaught Error: (.*?)(?:\n| at )/)?.[1] ??
          "Non riesco a salvare gli orari.")
        : "Non riesco a salvare gli orari.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}
