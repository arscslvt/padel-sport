import { api } from "@padel-sport/backend/convex/_generated/api";
import { SOCIAL_POST_KINDS } from "@padel-sport/backend/convex/modules/social/lib";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Come e se il circolo parla sui social.
 *
 * Anche la lettura passa da qui, al contrario della configurazione delle
 * prenotazioni che il sito espone in chiaro: gli orari di apertura li deve
 * vedere chi prenota, il tono di voce del circolo no.
 */
export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const settings = await gate.convex.query(api.modules.social.settings.get, {
      secret: gate.secret,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Impostazioni social non recuperate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere le impostazioni.") },
      { status: 502 },
    );
  }
}

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  modes: z
    .array(
      z.object({
        kind: z.enum(SOCIAL_POST_KINDS),
        mode: z.enum(["manual", "review", "auto"]),
      }),
    )
    .optional(),
  maxPerDay: z.number().int().min(1).max(10).optional(),
  tone: z.string().max(600).optional(),
  avoid: z.string().max(600).optional(),
  baseHashtags: z.array(z.string().min(2).max(40)).max(10).optional(),
});

export async function PATCH(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.modules.social.settings.update, {
      secret: gate.secret,
      ...parsed.data,
      updatedBy: gate.userId,
    });

    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("Impostazioni social non salvate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare le impostazioni.") },
      { status: 400 },
    );
  }
}
