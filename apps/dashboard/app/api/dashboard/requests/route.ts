import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";

/**
 * Le richieste che arrivano dai moduli del sito: assistenza, cerca-giocatori
 * e segnalazioni sui punti dall'area personale.
 *
 * Passa da qui e non da `useQuery` nel browser per la stessa ragione
 * dell'agenda: sono nomi, mail e numeri di telefono, e il deployment Convex ha
 * un URL pubblico — sta nel bundle del sito — quindi «la chiama solo la
 * dashboard» non è mai stata una protezione.
 *
 * Le liste tornano insieme: la pagina le mostra affiancate, e due chiamate
 * vorrebbero dire due stati di caricamento per una sola schermata.
 */
export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const [support, matches, reports] = await Promise.all([
      gate.convex.query(api.modules.supportRequests.list.default, {
        ...gate.credentials,
      }),
      gate.convex.query(api.modules.matchRequests.list.default, {
        ...gate.credentials,
      }),
      gate.convex.query(api.modules.pointReports.list.default, {
        ...gate.credentials,
      }),
    ]);

    return NextResponse.json({ support, matches, reports });
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
  z.object({
    kind: z.literal("report"),
    requestId: z.string().min(1),
    status: z.enum(["new", "in_progress", "resolved", "archived"]),
    /** La risposta per il cliente, mandata con la mail di chiusura. */
    reply: z.string().max(1000).optional(),
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
  let notified = false;

  try {
    if (kind === "support") {
      await gate.convex.mutation(api.modules.supportRequests.update.default, {
        ...gate.credentials,
        requestId: requestId as Id<"supportRequests">,
        status,
      });
    } else if (kind === "match") {
      await gate.convex.mutation(api.modules.matchRequests.update.default, {
        ...gate.credentials,
        requestId: requestId as Id<"matchRequests">,
        status,
      });
    } else {
      const result = await gate.convex.mutation(
        api.modules.pointReports.update.default,
        {
          ...gate.credentials,
          reportId: requestId as Id<"pointReports">,
          status,
          reply: parsed.data.kind === "report" ? parsed.data.reply : undefined,
        },
      );
      notified = result.notified;
    }

    return NextResponse.json({ updated: true, notified });
  } catch (error) {
    console.error("Richiesta non aggiornata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad aggiornare la richiesta.") },
      { status: 400 },
    );
  }
}
