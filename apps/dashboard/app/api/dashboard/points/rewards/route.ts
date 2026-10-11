import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/** Il catalogo premi: elenco e salvataggio. Solo staff. */

const bodySchema = z.object({
  rewardId: z.string().optional(),
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(600),
  cost: z.number().int().min(1).max(100000),
  terms: z.string().trim().max(1000).optional(),
  validityDays: z.number().int().min(1).max(3650).optional(),
  imageStorageId: z.string().optional(),
  removeImage: z.boolean().optional(),
});

export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const rewards = await gate.convex.query(api.modules.points.rewards.list, {
      secret: gate.secret,
    });

    return NextResponse.json({ rewards });
  } catch (error) {
    console.error("Premi non recuperati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere i premi.") },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Servono titolo, descrizione e un costo in punti." },
      { status: 400 },
    );
  }

  const { rewardId, imageStorageId, ...rest } = parsed.data;

  try {
    await gate.convex.mutation(api.modules.points.rewards.save, {
      secret: gate.secret,
      rewardId: rewardId ? (rewardId as Id<"rewards">) : undefined,
      imageStorageId: imageStorageId
        ? (imageStorageId as Id<"_storage">)
        : undefined,
      ...rest,
      terms: rest.terms || undefined,
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Premio non salvato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare il premio.") },
      { status: 400 },
    );
  }
}
