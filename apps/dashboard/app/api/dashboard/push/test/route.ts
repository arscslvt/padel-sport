import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Una notifica di prova al dispositivo da cui la si chiede: la sola prova che
 * conta, perché attraversa tutto — chiave VAPID, servizio push, service
 * worker, permessi del telefono.
 */

const testSchema = z.object({ endpoint: z.url() });

export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = testSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    await gate.convex.mutation(api.modules.push.subscriptions.test, {
      secret: gate.secret,
      endpoint: parsed.data.endpoint,
    });
    return NextResponse.json({ sent: true });
  } catch (error) {
    console.error("Notifica di prova non inviata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a mandare la prova.") },
      { status: 502 },
    );
  }
}
