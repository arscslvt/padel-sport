import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

const patchSchema = z.object({ disabled: z.boolean() });

/** Disattiva il premio o lo riattiva: una pausa, non un ritiro. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ rewardId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { rewardId } = await params;

  try {
    await gate.convex.mutation(api.modules.points.rewards.setDisabled, {
      secret: gate.secret,
      rewardId: rewardId as Id<"rewards">,
      disabled: parsed.data.disabled,
    });

    return NextResponse.json({ disabled: parsed.data.disabled });
  } catch (error) {
    console.error("Premio non aggiornato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad aggiornare il premio.") },
      { status: 400 },
    );
  }
}

/** Toglie il premio dalla vetrina. Chi l'ha già riscattato lo tiene. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ rewardId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { rewardId } = await params;

  try {
    await gate.convex.mutation(api.modules.points.rewards.archive, {
      secret: gate.secret,
      rewardId: rewardId as Id<"rewards">,
    });

    return NextResponse.json({ archived: true });
  } catch (error) {
    console.error("Premio non rimosso:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a rimuovere il premio.") },
      { status: 400 },
    );
  }
}
