import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/** Tessera annuale: apertura, rinnovo e pagamento. Solo staff. */

const bodySchema = z.object({
  membershipId: z.string().optional(),
  startsAt: z.number().optional(),
  paid: z.boolean(),
  paidAt: z.number().optional(),
  method: z.enum(["cash", "pos"]).optional(),
  amount: z.number().min(0).max(10000).optional(),
  note: z.string().trim().max(300).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { membershipId, ...rest } = parsed.data;

  try {
    const result = await gate.convex.mutation(
      api.modules.clients.membership.save,
      {
        secret: gate.secret,
        playerId: playerId as Id<"players">,
        membershipId: membershipId
          ? (membershipId as Id<"memberships">)
          : undefined,
        ...rest,
      },
    );

    return NextResponse.json({ saved: true, renewed: result?.renewed });
  } catch (error) {
    console.error("Tessera non salvata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare la tessera.") },
      { status: 400 },
    );
  }
}
