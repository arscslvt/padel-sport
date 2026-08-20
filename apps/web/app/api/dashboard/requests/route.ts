import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Le richieste che arrivano dai moduli del sito: assistenza e cerca-giocatori.
 *
 * Passa da qui e non da `useQuery` nel browser per la stessa ragione
 * dell'agenda: sono nomi, mail e numeri di telefono, e il deployment Convex ha
 * un URL pubblico — sta nel bundle del sito — quindi «la chiama solo la
 * dashboard» non è mai stata una protezione.
 *
 * Le due liste tornano insieme: la pagina le mostra affiancate, e due chiamate
 * vorrebbero dire due stati di caricamento per una sola schermata.
 */
export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const [support, matches] = await Promise.all([
      gate.convex.query(api.modules.supportRequests.list.default, {
        secret: gate.secret,
      }),
      gate.convex.query(api.modules.matchRequests.list.default, {
        secret: gate.secret,
      }),
    ]);

    return NextResponse.json({ support, matches });
  } catch (error) {
    console.error("Richieste non recuperate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere le richieste.") },
      { status: 502 },
    );
  }
}

const patchSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("support"),
    requestId: z.string().min(1),
    status: z.enum(["new", "in_progress", "resolved", "archived"]),
  }),
  z.object({
    kind: z.literal("match"),
    requestId: z.string().min(1),
    status: z.enum(["new", "in_progress", "fulfilled", "cancelled"]),
  }),
]);

/** Sposta una richiesta di stato: presa in carico, chiusa, archiviata. */
export async function PATCH(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { kind, requestId, status } = parsed.data;

  try {
    if (kind === "support") {
      await gate.convex.mutation(api.modules.supportRequests.update.default, {
        secret: gate.secret,
        requestId: requestId as Id<"supportRequests">,
        status,
      });
    } else {
      await gate.convex.mutation(api.modules.matchRequests.update.default, {
        secret: gate.secret,
        requestId: requestId as Id<"matchRequests">,
        status,
      });
    }

    return NextResponse.json({ updated: true });
  } catch (error) {
    console.error("Richiesta non aggiornata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad aggiornare la richiesta.") },
      { status: 400 },
    );
  }
}
