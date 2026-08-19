import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Gli iscritti a un modulo di un evento, e la loro cancellazione dallo staff.
 *
 * Nomi e indirizzi email di persone: la sola presenza di una sessione non
 * bastava — «essere loggati» lo è anche il cliente accanto, che non ha titolo
 * per leggere chi altro si è iscritto.
 */

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const blockKey = searchParams.get("key");

  if (!eventId || !blockKey) {
    return NextResponse.json({ error: "Parametri mancanti." }, { status: 400 });
  }

  try {
    const entries = await gate.convex.query(
      api.modules.eventRsvps.list.default,
      {
        secret: gate.secret,
        eventId,
        blockKey,
      },
    );

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Iscrizioni non recuperate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere le iscrizioni.") },
      { status: 502 },
    );
  }
}

const cancelSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(
      api.modules.eventRsvps.cancel.byStaff,
      { secret: gate.secret, id: parsed.data.id as Id<"eventRsvps"> },
    );

    return NextResponse.json({ cancelled: true, rsvp: result });
  } catch (error) {
    console.error("Iscrizione non annullata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad annullare l'iscrizione.") },
      { status: 400 },
    );
  }
}
