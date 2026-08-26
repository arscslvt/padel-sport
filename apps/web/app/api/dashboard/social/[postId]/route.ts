import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Correzioni dello staff su una bozza.
 *
 * Separata dalle decisioni di approvare o scartare perché è un'altra cosa:
 * quelle spostano una riga di stato, questa ne riscrive il contenuto. Tenerle
 * insieme avrebbe voluto dire un `PATCH` che a seconda del corpo fa due mestieri
 * diversi.
 *
 * Toccare la locandina fa rigenerare il lasciapassare lato Convex, e quindi
 * cambia l'indirizzo dell'immagine: la risposta lo dice, così il pannello sa
 * che deve ricaricare l'anteprima invece di mostrare quella vecchia rimasta in
 * cache dal browser.
 */
const patchSchema = z.object({
  caption: z.string().min(1).max(2200).optional(),
  hashtags: z.array(z.string().min(2).max(60)).max(30).optional(),
  altText: z.string().max(400).optional(),
  poster: z
    .object({
      eyebrow: z.string().min(1),
      headline: z.string().min(1),
      subhead: z.string().optional(),
      bullets: z.array(z.string()).optional(),
      footer: z.string().optional(),
      accent: z.enum(["ink", "light", "photo"]),
    })
    .optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { postId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(
      api.modules.social.update.default,
      {
        secret: gate.secret,
        postId: postId as Id<"socialPosts">,
        ...parsed.data,
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Bozza social non modificata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare le modifiche.") },
      { status: 400 },
    );
  }
}
