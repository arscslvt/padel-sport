import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { clerkIdentities, convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/** La scheda di un cliente: lettura e correzione dell'anagrafica. Solo staff. */

const patchSchema = z.object({
  firstName: z.string().trim().min(2).max(60).optional(),
  email: z.email().optional().or(z.literal("")),
  lastName: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().max(30).optional(),
  birthDate: z.number().optional(),
  birthPlace: z.string().trim().max(80).optional(),
  gender: z.enum(["f", "m", "other", "unspecified"]).optional(),
  level: z.number().min(1).max(5).optional(),
  taxCode: z.string().trim().max(16).optional(),
  residence: z
    .object({
      address: z.string().trim().max(120).optional(),
      city: z.string().trim().max(80).optional(),
      postalCode: z
        .string()
        .trim()
        .regex(/^\d{5}$/, "Il CAP deve essere di cinque cifre.")
        .optional()
        .or(z.literal("")),
    })
    .optional(),
  health: z
    .object({
      allergies: z.string().trim().max(500).optional(),
      conditions: z.string().trim().max(500).optional(),
      disability: z.string().trim().max(500).optional(),
    })
    .optional(),
  clubNotes: z.string().trim().max(1000).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;

  try {
    const client = await gate.convex.query(api.modules.clients.list.detail, {
      secret: gate.secret,
      playerId: playerId as Id<"players">,
    });

    if (!client) {
      return NextResponse.json(
        { error: "Cliente non trovato." },
        { status: 404 },
      );
    }

    // Email e foto vivono su Clerk quando un account c'è: la scheda le mostra
    // anche prima che l'elenco le abbia ricopiate su Convex (lib/clients.ts).
    // Una scheda aperta allo sportello non ha niente da chiedere a Clerk.
    const identity = client.clerkUserId
      ? (await clerkIdentities([client.clerkUserId])).get(client.clerkUserId)
      : undefined;

    const email = client.email ?? identity?.email;

    return NextResponse.json({
      client: {
        ...client,
        email,
        avatarUrl: client.avatarUrl ?? identity?.avatarUrl,
        missingFields: email
          ? client.missingFields.filter((field) => field !== "email")
          : client.missingFields,
      },
    });
  } catch (error) {
    console.error("Scheda cliente non recuperata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere la scheda.") },
      { status: 502 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const { email, ...rest } = parsed.data;

    await gate.convex.mutation(api.modules.clients.profile.update, {
      secret: gate.secret,
      playerId: playerId as Id<"players">,
      email: email || undefined,
      ...rest,
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Anagrafica non salvata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare i dati.") },
      { status: 400 },
    );
  }
}

/** Elimina una scheda aperta per sbaglio. I paletti stanno nella mutation. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;

  try {
    await gate.convex.mutation(api.modules.clients.profile.remove, {
      secret: gate.secret,
      playerId: playerId as Id<"players">,
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Scheda non eliminata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a eliminare la scheda.") },
      { status: 400 },
    );
  }
}
