import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * «Rifallo, ma così.»
 *
 * Separata dalle correzioni a mano perché è l'altra metà del mestiere: lì lo
 * staff riscrive, qui rimanda indietro il lavoro con un'indicazione. Il testo
 * dell'indicazione finisce nel prompt, quindi vale la pena che sia specifico —
 * «troppo lungo» produce risultati migliori di «non mi piace».
 */
const bodySchema = z.object({
  feedback: z.string().max(500).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { postId } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.modules.social.regenerate.default, {
      secret: gate.secret,
      postId: postId as Id<"socialPosts">,
      reviewedBy: gate.userId,
      feedback: parsed.data.feedback,
    });

    return NextResponse.json({ regenerating: true });
  } catch (error) {
    console.error("Bozza social non rigenerata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a rifare la bozza.") },
      { status: 400 },
    );
  }
}
