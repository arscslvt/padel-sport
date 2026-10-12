import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/** Salva il prezzo di un servizio del listino. Solo staff. */

const bodySchema = z.object({
  kind: z.literal("match"),
  price: z.number().positive().max(500),
  /** `null` spegne la tariffa tesserati. */
  memberPrice: z.number().positive().max(500).nullable(),
});

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Indica un prezzo valido, in euro." },
      { status: 400 },
    );
  }

  const { kind, price, memberPrice } = parsed.data;

  try {
    await gate.convex.mutation(api.modules.pricing.services.save, {
      secret: gate.secret,
      kind,
      price,
      memberPrice: memberPrice ?? undefined,
    });

    return NextResponse.json({ saved: true });
  } catch (error) {
    console.error("Prezzo non salvato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare il prezzo.") },
      { status: 400 },
    );
  }
}
