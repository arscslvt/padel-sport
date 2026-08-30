import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { SOCIAL_POST_KINDS } from "@padel-sport/backend/convex/modules/social/lib";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * I template: quelli che esistono, quelli che mancano, e la richiesta di
 * scriverne di nuovi.
 *
 * È la schermata dove si fa la revisione che conta in tutto questo sistema: si
 * legge una volta una frase che verrà usata cento volte. Tutto il resto — i
 * contenuti veri — da qui in poi è sostituzione di testo.
 */
export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const data = await gate.convex.query(
      api.modules.social.templates.list.default,
      { secret: gate.secret },
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("Template non recuperati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere i template.") },
      { status: 502 },
    );
  }
}

const reviewSchema = z.object({
  templateId: z.string().min(1),
  status: z.enum(["approved", "rejected", "retired"]),
  feedback: z.string().max(500).optional(),
});

/** Approva, scarta o ritira un template. */
export async function PATCH(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = reviewSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.modules.social.templates.review.default, {
      secret: gate.secret,
      templateId: parsed.data.templateId as Id<"socialTemplates">,
      status: parsed.data.status,
      reviewedBy: gate.userId,
      feedback: parsed.data.feedback,
    });

    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("Template non aggiornato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad aggiornare il template.") },
      { status: 400 },
    );
  }
}

const requestSchema = z.object({
  // L'elenco vero dei trigger invece di una stringa qualunque: così un tipo
  // inventato viene respinto qui, con un 400, invece di arrivare a Convex.
  kind: z.enum(SOCIAL_POST_KINDS),
  situation: z.string().min(1),
  count: z.number().int().min(1).max(8).optional(),
  feedback: z.string().max(500).optional(),
});

/**
 * Chiede al modello di scrivere template per una situazione.
 *
 * Risponde subito e non aspetta: la scrittura di sei varianti dura decine di
 * secondi, e tenere aperta una richiesta HTTP per tutto quel tempo è il modo
 * più semplice di farla scadere a metà. Le varianti compaiono nell'elenco
 * quando sono pronte.
 */
export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.modules.social.templates.request.default, {
      secret: gate.secret,
      ...parsed.data,
    });

    return NextResponse.json({ requested: true });
  } catch (error) {
    console.error("Template non richiesti:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a chiedere i template.") },
      { status: 400 },
    );
  }
}
