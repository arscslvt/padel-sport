import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

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
