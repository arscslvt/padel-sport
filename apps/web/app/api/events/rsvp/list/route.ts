import { auth } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { convexSessionToken } from "@/lib/convex-token";
import { isStaffMember } from "@/lib/staff";

/**
 * Elenco degli iscritti a un modulo, per il pannello dentro Sanity Studio.
 *
 * Lo Studio sta su `/studio`, cioè sullo stesso dominio del sito: il cookie di
 * Clerk arriva fin qui e permette di distinguere lo staff da chiunque altro.
 * Chi apre lo Studio senza sessione sul sito vede il modulo ma non i nomi.
 *
 * Il controllo è doppio di proposito: qui filtriamo per organizzazione, e la
 * query Convex pretende comunque un'identità — l'URL del deployment è
 * pubblico, quindi non può bastare la guardia di questa route.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const blockKey = searchParams.get("key");

  if (!eventId || !blockKey) {
    return NextResponse.json({ error: "Parametri mancanti." }, { status: 400 });
  }

  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Serve l'accesso con l'account dello staff." },
      { status: 401 },
    );
  }

  if (!(await isStaffMember(userId))) {
    return NextResponse.json(
      { error: "Questo account non fa parte dello staff." },
      { status: 403 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile." },
      { status: 500 },
    );
  }

  // Stessa scelta che fa il browser fra token di sessione e template JWT
  // (vedi lib/convex-token.ts e convex/auth.config.ts).
  const token = await convexSessionToken();

  if (!token) {
    return NextResponse.json(
      { error: "Sessione non valida per il backend. Riaccedi al sito." },
      { status: 401 },
    );
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    convex.setAuth(token);

    const entries = await convex.query(api.modules.eventRsvps.list.default, {
      eventId,
      blockKey,
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("Lettura delle iscrizioni fallita:", error);
    return NextResponse.json(
      { error: "Non riesco a leggere le iscrizioni." },
      { status: 502 },
    );
  }
}
