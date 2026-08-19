import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";

import { staffGate } from "@/lib/dashboard-api";

/**
 * Elenco degli iscritti a un modulo, per il pannello dentro Sanity Studio.
 *
 * Lo Studio sta su `/studio`, cioè sullo stesso dominio del sito: il cookie di
 * Clerk arriva fin qui e permette di distinguere lo staff da chiunque altro.
 * Chi apre lo Studio senza sessione sul sito vede il modulo ma non i nomi.
 *
 * Il controllo è doppio di proposito: `staffGate` filtra per organizzazione e
 * la query Convex pretende comunque il segreto condiviso — l'URL del
 * deployment è pubblico, quindi non può bastare la guardia di questa route.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const blockKey = searchParams.get("key");

  if (!eventId || !blockKey) {
    return NextResponse.json({ error: "Parametri mancanti." }, { status: 400 });
  }

  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const entries = await gate.convex.query(
      api.modules.eventRsvps.list.default,
      {
        secret: gate.secret,
        eventId,
        blockKey,
      },
    );

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Lettura delle iscrizioni fallita:", error);
    return NextResponse.json(
      { error: "Non riesco a leggere le iscrizioni." },
      { status: 502 },
    );
  }
}
