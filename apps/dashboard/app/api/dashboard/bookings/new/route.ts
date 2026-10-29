import { currentUser } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Una prenotazione presa dallo staff (bookings/staffCreate.ts). Le regole
 * stanno nella mutation: qui solo la forma dei dati e la verifica di chi
 * chiede.
 */

const createSchema = z.object({
  bookingDate: z.number(),
  /** Quanti campi prende il gruppo: due per otto persone. */
  courts: z.number().int().min(1).max(2).optional(),
  /** I campi scelti; senza, i primi liberi. */
  slotIds: z.array(z.string().min(1)).max(2).optional(),
  playerId: z.string().optional(),
  bookedBy: z.string().trim().min(2).max(80),
  phone: z.string().trim().max(30).optional(),
  players: z.array(z.string().trim().max(80)).max(8),
  /** I compagni scelti fra i clienti in anagrafica. */
  linkedPlayerIds: z.array(z.string().min(1)).max(8).optional(),
  /** Il recapito degli altri giocatori che non sono in anagrafica. */
  guestContacts: z
    .array(
      z.object({
        name: z.string().trim().max(80),
        phone: z.string().trim().max(30),
      }),
    )
    .max(8)
    .optional(),
  level: z.enum(["principiante", "intermedio", "avanzato"]),
  notify: z.boolean(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Controlla nome, orario e giocatori." },
      { status: 400 },
    );
  }

  const { slotIds, playerId, phone, linkedPlayerIds, ...rest } = parsed.data;

  // Chi la prende resta scritto nella scheda: il nome com'è oggi su Clerk.
  const user = await currentUser().catch(() => null);
  const staffName =
    user?.fullName?.trim() ||
    user?.primaryEmailAddress?.emailAddress ||
    "Operatore";

  try {
    const result = await gate.convex.mutation(
      api.bookings.staffCreate.default,
      {
        ...gate.credentials,
        ...rest,
        phone: phone || undefined,
        slotIds: slotIds?.map((id) => id as Id<"slots">),
        playerId: playerId ? (playerId as Id<"players">) : undefined,
        linkedPlayerIds: linkedPlayerIds?.map((id) => id as Id<"players">),
        staff: { userId: gate.userId, name: staffName },
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Prenotazione dello staff non creata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a creare la prenotazione.") },
      { status: 400 },
    );
  }
}
