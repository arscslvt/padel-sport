import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Le bozze social e le decisioni dello staff.
 *
 * Passa da qui e non da `useQuery` nel browser per la ragione di sempre: il
 * deployment Convex ha un indirizzo pubblico — sta nel bundle del sito — e
 * queste righe portano con sé il campo `facts`, cioè il testo consegnato al
 * modello. È l'unico posto in cui si può verificare che una promessa di
 * anonimato sia stata mantenuta, e non è materiale da lasciare a portata di
 * chiunque apra gli strumenti per sviluppatori.
 *
 * Chi approva viene firmato con il proprio identificativo Clerk, che la guardia
 * restituisce già: una decisione senza un nome accanto, fra sei mesi, non si
 * riesce più a ricostruire.
 */
export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const data = await gate.convex.query(api.modules.social.list.default, {
      secret: gate.secret,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Bozze social non recuperate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere le bozze.") },
      { status: 502 },
    );
  }
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), postId: z.string().min(1) }),
  z.object({
    action: z.literal("reject"),
    postId: z.string().min(1),
    feedback: z.string().max(500).optional(),
  }),
]);

/** Approva o scarta una bozza. */
export async function PATCH(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const postId = parsed.data.postId as Id<"socialPosts">;

  try {
    if (parsed.data.action === "approve") {
      await gate.convex.mutation(api.modules.social.approve.default, {
        secret: gate.secret,
        postId,
        reviewedBy: gate.userId,
      });
    } else {
      await gate.convex.mutation(api.modules.social.reject.default, {
        secret: gate.secret,
        postId,
        reviewedBy: gate.userId,
        feedback: parsed.data.feedback,
      });
    }

    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("Bozza social non aggiornata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad aggiornare la bozza.") },
      { status: 400 },
    );
  }
}
