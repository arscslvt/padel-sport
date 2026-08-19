import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * L'agenda della struttura: leggerla, accettare una prenotazione, annullarla.
 *
 * Passa da qui e non da `useQuery` nel browser perché sono dati e azioni della
 * struttura: nomi e telefoni dei clienti da una parte, conferme e disdette
 * dall'altra. Il deployment Convex ha un URL pubblico — sta nel bundle del
 * sito — quindi «lo chiama solo la dashboard» non è mai stata una protezione.
 */

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const includePast =
    new URL(request.url).searchParams.get("includePast") === "true";

  try {
    const bookings = await gate.convex.query(api.bookings.list.default, {
      secret: gate.secret,
      includePast,
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Prenotazioni non recuperate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere le prenotazioni.") },
      { status: 502 },
    );
  }
}

const acceptSchema = z.object({
  bookingId: z.string().min(1),
  withNotification: z.boolean().optional(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = acceptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.bookings.update.accept, {
      secret: gate.secret,
      bookingId: parsed.data.bookingId as Id<"bookings">,
      withNotification: parsed.data.withNotification,
    });

    return NextResponse.json({ accepted: true });
  } catch (error) {
    console.error("Prenotazione non accettata:", error);
    return NextResponse.json(
      {
        error: convexMessage(error, "Non riesco ad accettare la prenotazione."),
      },
      { status: 400 },
    );
  }
}

const deleteSchema = z.object({ bookingId: z.string().min(1) });

export async function DELETE(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.bookings.delete.default, {
      secret: gate.secret,
      bookingId: parsed.data.bookingId as Id<"bookings">,
    });

    return NextResponse.json({ cancelled: true });
  } catch (error) {
    console.error("Prenotazione non annullata:", error);
    return NextResponse.json(
      {
        error: convexMessage(error, "Non riesco ad annullare la prenotazione."),
      },
      { status: 400 },
    );
  }
}
