import { api } from "@padel-sport/backend/convex/_generated/api";
import { NOTIFICATION_CATEGORIES } from "@padel-sport/backend/convex/utils/notificationCategories";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * I tipi di avviso che chi è in sessione non vuole ricevere come push.
 * Valgono su tutti i suoi dispositivi: sono sue, non del telefono.
 */

const CATEGORY_KEYS = NOTIFICATION_CATEGORIES.map((category) => category.key);

const preferencesSchema = z.object({
  muted: z.array(z.enum(CATEGORY_KEYS)),
});

export async function PUT(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = preferencesSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(
      api.modules.push.preferences.set,
      {
        ...gate.credentials,
        userId: gate.userId,
        muted: parsed.data.muted,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    console.error("Preferenze delle notifiche non salvate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a salvare le preferenze.") },
      { status: 502 },
    );
  }
}
