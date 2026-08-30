import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

/**
 * Sanity ci dice che un evento è stato pubblicato, cambiato o tolto.
 *
 * Gli eventi del sito vivono nel CMS: non c'è una mutation Convex a cui
 * agganciarsi, e questo è l'unico momento in cui si sa che ce n'è uno nuovo.
 *
 * Due serrature in fila, come ovunque qui dentro: la firma di Sanity dice che
 * la richiesta viene davvero da loro, il segreto condiviso autentica il salto
 * verso Convex. La prima sostituisce Clerk, che su un webhook non c'è.
 *
 * La firma si verifica a mano invece di installare `@sanity/webhook`: sono venti
 * righe di Web Crypto contro un pacchetto in più nel fagotto, ed è la stessa
 * scelta che `courtCalendar/client.ts` racconta di aver fatto con `googleapis`.
 */
export const dynamic = "force-dynamic";

/** Oltre questo, una richiesta è vecchia: è la difesa contro chi la riusa. */
const MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Confronto a tempo costante.
 *
 * Con `===` il tempo di risposta racconta quanti caratteri iniziali sono
 * giusti, e con abbastanza tentativi una firma si ricostruisce un pezzo alla
 * volta. Qui si guardano tutti i byte comunque.
 */
function sameSignature(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function signatureIsValid(
  header: string | null,
  body: string,
  secret: string,
): Promise<boolean> {
  if (!header) return false;

  // Formato: t=<millisecondi>,v1=<firma in base64url>
  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const at = piece.indexOf("=");
      return [piece.slice(0, at).trim(), piece.slice(at + 1).trim()];
    }),
  );

  const timestamp = Number(parts.t);
  const provided = parts.v1;

  if (!Number.isFinite(timestamp) || !provided) return false;
  if (Math.abs(Date.now() - timestamp) > MAX_AGE_MS) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${timestamp}.${body}`),
  );

  const expected = Buffer.from(signed)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return sameSignature(expected, provided);
}

export async function POST(request: Request) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const sharedSecret = process.env.BOOKING_WEBHOOK_SECRET;

  if (!secret || !convexUrl || !sharedSecret) {
    console.error(
      "Webhook Sanity non configurato: manca SANITY_WEBHOOK_SECRET, NEXT_PUBLIC_CONVEX_URL o BOOKING_WEBHOOK_SECRET.",
    );
    return NextResponse.json(
      { error: "Servizio non disponibile." },
      { status: 500 },
    );
  }

  // Il corpo grezzo **prima** di qualunque analisi: la firma copre i byte
  // esatti che sono arrivati, e un `JSON.parse` seguito da un `stringify` ne
  // cambia abbastanza — spazi, ordine delle chiavi — da non farla mai tornare.
  const body = await request.text();

  if (
    !(await signatureIsValid(
      request.headers.get("sanity-webhook-signature"),
      body,
      secret,
    ))
  ) {
    console.warn("Webhook Sanity con firma non valida.");
    return NextResponse.json({ error: "Firma non valida." }, { status: 401 });
  }

  let payload: {
    _id?: string;
    title?: string;
    excerpt?: string;
    dateStart?: string;
    dateEnd?: string;
    tags?: string[];
    _deleted?: boolean;
  };

  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Corpo non valido." }, { status: 400 });
  }

  if (!payload._id || !payload.title || !payload.dateStart) {
    // Un documento senza data non è un evento annunciabile. Si risponde 200
    // perché la richiesta era legittima: un 4xx farebbe ritentare Sanity per
    // qualcosa che non migliorerà mai.
    return NextResponse.json({ ignored: true });
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);

    const result = await convex.mutation(api.modules.social.webhook.default, {
      secret: sharedSecret,
      documentId: payload._id,
      title: payload.title,
      excerpt: payload.excerpt,
      startsAt: payload.dateStart,
      endsAt: payload.dateEnd,
      tags: payload.tags,
      deleted: payload._deleted,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Evento non propagato ai social:", error);
    // Un 502 fa ritentare Sanity, che è quel che si vuole per un guasto
    // passeggero di Convex.
    return NextResponse.json(
      { error: "Non riesco a registrare l'evento." },
      { status: 502 },
    );
  }
}
