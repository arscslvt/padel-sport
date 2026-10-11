import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/** Toglie un preset dall'elenco. I movimenti già fatti ne conservano il nome. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ presetId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { presetId } = await params;

  try {
    await gate.convex.mutation(api.modules.points.presets.archive, {
      secret: gate.secret,
      presetId: presetId as Id<"pointPresets">,
    });

    return NextResponse.json({ archived: true });
  } catch (error) {
    console.error("Preset non rimosso:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a rimuovere il preset.") },
      { status: 400 },
    );
  }
}
