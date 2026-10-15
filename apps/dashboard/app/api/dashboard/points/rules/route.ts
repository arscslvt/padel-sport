import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffAdminGate, staffGate } from "@/lib/dashboard-api";

/**
 * Le azioni che fanno guadagnare punti da sole: le vede tutto lo staff, le
 * accende, le spegne e ne cambia i punti solo un amministratore.
 */

const bodySchema = z.object({
  key: z.enum(["first_match", "weekly_three", "online_payment", "referral"]),
  points: z.number().int().min(1).max(1000),
  /** Solo per «Amico invitato»: i punti all'amico. */
  friendPoints: z.number().int().min(1).max(1000).optional(),
  enabled: z.boolean(),
});

export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const rules = await gate.convex.query(api.modules.points.rules.list, {
      secret: gate.secret,
    });
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Azioni premiate non recuperate:", error);
    return NextResponse.json(
      {
        error: convexMessage(error, "Non riesco a leggere le azioni premiate."),
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const gate = await staffAdminGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "I punti sono un numero intero da 1 a 1000." },
      { status: 400 },
    );
  }

  try {
    await gate.convex.mutation(api.modules.points.rules.save, {
      secret: gate.secret,
      clerkUserId: gate.userId,
      ...parsed.data,
    });
    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Azione premiata non salvata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare l'azione.") },
      { status: 400 },
    );
  }
}
