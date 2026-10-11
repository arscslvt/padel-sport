import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/** Le causali pronte per caricare punti: elenco e salvataggio. Solo staff. */

const bodySchema = z.object({
  presetId: z.string().optional(),
  label: z.string().trim().min(2).max(60),
  points: z.number().int().min(-1000).max(1000),
});

export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    // Il primo che apre la sezione trova già «Partita vinta»: è il preset con
    // cui il club ha chiesto di partire.
    await gate.convex.mutation(api.modules.points.presets.ensureDefaults, {
      secret: gate.secret,
    });

    const presets = await gate.convex.query(api.modules.points.presets.list, {
      secret: gate.secret,
    });

    return NextResponse.json({ presets });
  } catch (error) {
    console.error("Preset dei punti non recuperati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere i preset.") },
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
      { error: "Servono un nome e un numero intero di punti." },
      { status: 400 },
    );
  }

  const { presetId, ...rest } = parsed.data;

  try {
    await gate.convex.mutation(api.modules.points.presets.save, {
      secret: gate.secret,
      presetId: presetId ? (presetId as Id<"pointPresets">) : undefined,
      ...rest,
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Preset non salvato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare il preset.") },
      { status: 400 },
    );
  }
}
