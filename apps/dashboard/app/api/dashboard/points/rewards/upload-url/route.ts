import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * L'indirizzo a cui caricare la foto di un premio. Il file non passa da qui:
 * il browser lo manda dritto a Convex (modules/points/rewards.ts).
 */
export async function POST() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const url = await gate.convex.mutation(
      api.modules.points.rewards.uploadUrl,
      { secret: gate.secret },
    );

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Indirizzo di caricamento non ottenuto:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a preparare il caricamento.") },
      { status: 502 },
    );
  }
}
