import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Chiude un riscatto: consegnato (`used`) oppure annullato con i punti
 * restituiti (`cancel`). Solo staff.
 */

const bodySchema = z.object({ action: z.enum(["used", "cancel"]) });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ redemptionId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { redemptionId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Azione non valida." }, { status: 400 });
  }

  const id = redemptionId as Id<"rewardRedemptions">;

  try {
    if (parsed.data.action === "used") {
      await gate.convex.mutation(api.modules.points.redemptions.markUsed, {
        secret: gate.secret,
        redemptionId: id,
      });
    } else {
      await gate.convex.mutation(api.modules.points.redemptions.cancel, {
        secret: gate.secret,
        redemptionId: id,
        createdByClerkUserId: gate.userId,
      });
    }

    return NextResponse.json({ done: true });
  } catch (error) {
    console.error("Riscatto non aggiornato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad aggiornare il riscatto.") },
      { status: 400 },
    );
  }
}
