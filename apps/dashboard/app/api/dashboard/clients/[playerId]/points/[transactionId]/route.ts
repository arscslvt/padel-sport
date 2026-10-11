import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Annulla un movimento in attesa caricato per sbaglio. Solo staff, e solo
 * finché il cliente non ha aderito: dopo, i punti sono suoi e si correggono con
 * un movimento opposto.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { transactionId } = await params;

  try {
    await gate.convex.mutation(api.modules.points.ledger.removePending, {
      secret: gate.secret,
      transactionId: transactionId as Id<"pointTransactions">,
    });

    return NextResponse.json({ removed: true });
  } catch (error) {
    console.error("Movimento in attesa non annullato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad annullare il movimento.") },
      { status: 400 },
    );
  }
}
