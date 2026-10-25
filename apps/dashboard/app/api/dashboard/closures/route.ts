import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffAdminGate } from "@/lib/dashboard-api";

/**
 * Le chiusure del club per date: aggiungerne una, toglierla. Solo staff.
 * Valgono subito, senza passare dal salvataggio degli orari. Con `start` ed
 * `end` chiudono solo una fascia del giorno (la pioggia, dall'agenda).
 */

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const time = z.string().regex(/^([01]\d|2[0-3]):(00|30)$/);

const addSchema = z.object({
  from: day,
  to: day,
  reason: z.string().trim().max(60).optional(),
  start: time.optional(),
  end: time.optional(),
});

const removeSchema = z.object({
  from: day,
  to: day,
  start: time.optional(),
  end: time.optional(),
});

export async function POST(request: Request) {
  const gate = await staffAdminGate();
  if (!gate.ok) return gate.response;

  const parsed = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Date non valide." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(
      api.modules.settings.booking.addClosure,
      {
        secret: gate.secret,
        ...parsed.data,
        reason: parsed.data.reason || undefined,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chiusura non salvata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare la chiusura.") },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request) {
  const gate = await staffAdminGate();
  if (!gate.ok) return gate.response;

  const parsed = removeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Date non valide." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.modules.settings.booking.removeClosure, {
      secret: gate.secret,
      ...parsed.data,
    });

    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error("Chiusura non rimossa:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a togliere la chiusura.") },
      { status: 400 },
    );
  }
}
