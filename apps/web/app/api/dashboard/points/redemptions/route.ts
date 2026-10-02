import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/** I premi riscattati da consegnare: la lista dello sportello. Solo staff. */
export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const redemptions = await gate.convex.query(
      api.modules.points.redemptions.pending,
      { secret: gate.secret },
    );

    return NextResponse.json({ redemptions });
  } catch (error) {
    console.error("Riscatti non recuperati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere i riscatti.") },
      { status: 502 },
    );
  }
}
