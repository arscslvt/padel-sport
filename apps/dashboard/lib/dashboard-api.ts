import "server-only";

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { STAFF_ADMIN_ROLE, staffMembership } from "@/lib/staff";

/**
 * Guardia comune alle route della dashboard.
 *
 * Il controllo vero è qui: Convex non sa chi è lo staff — quello lo sa Clerk,
 * attraverso l'organizzazione. Le mutation di configurazione si difendono con
 * un segreto condiviso, che senza questa guardia non basterebbe: è la stessa
 * doppia protezione dell'elenco iscritti agli eventi.
 */

/**
 * Quello che ogni chiamata a Convex porta con sé (`serverArgs`,
 * packages/backend/convex/functions.ts): il segreto, l'organizzazione da cui
 * Convex ricava il club, e chi chiede, per la manutenzione.
 */
export interface StaffCredentials {
  secret: string;
  clerkOrgId: string;
  actorUserId: string;
}

export type StaffGate =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      convex: ConvexHttpClient;
      /** Da spargere negli argomenti: `{ ...gate.credentials, … }`. */
      credentials: StaffCredentials;
      /** Chi dello staff sta chiedendo: serve a firmare quello che fa. */
      userId: string;
      /** Amministratore dello staff: configura il club, non solo lo usa. */
      isAdmin: boolean;
      /** L'organizzazione staff, su cui si aggiunge e si toglie. */
      organizationId: string;
    };

export async function staffGate(): Promise<StaffGate> {
  const { userId } = await auth();

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Serve l'accesso con l'account dello staff." },
        { status: 401 },
      ),
    };
  }

  const { isStaff, role, organizationId } = await staffMembership(userId);

  if (!isStaff || !organizationId) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Questo account non fa parte dello staff." },
        { status: 403 },
      ),
    };
  }

  return withConvex({
    userId,
    isAdmin: role === STAFF_ADMIN_ROLE,
    organizationId,
  });
}

/** La risposta per chi è dello staff ma non amministratore. */
export function adminOnly(): NextResponse {
  return NextResponse.json(
    { error: "Solo un amministratore dello staff può farlo." },
    { status: 403 },
  );
}

/**
 * Come `staffGate`, ma solo per gli amministratori dello staff: chi gestisce
 * le persone dello staff, la configurazione del club, il listino e il
 * catalogo dei premi. Il resto dello staff usa il gestionale, non lo
 * configura.
 */
export async function staffAdminGate(): Promise<StaffGate> {
  const gate = await staffGate();
  if (gate.ok && !gate.isAdmin) return { ok: false, response: adminOnly() };
  return gate;
}

/** Il client Convex e il segreto condiviso, o l'errore che dice cosa manca. */
function withConvex(
  who: Pick<
    Extract<StaffGate, { ok: true }>,
    "userId" | "isAdmin" | "organizationId"
  >,
): StaffGate {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.BOOKING_WEBHOOK_SECRET;

  // Dire *quale* manca: con due nomi in un messaggio solo si finisce a
  // controllarle entrambe, e su Vercel una variabile può esserci per Preview e
  // non per Production.
  const missing = [
    convexUrl ? null : "NEXT_PUBLIC_CONVEX_URL",
    secret ? null : "BOOKING_WEBHOOK_SECRET",
  ].filter(Boolean);

  if (!convexUrl || !secret) {
    console.error(`Variabili non configurate: ${missing.join(", ")}.`);
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: `Configurazione del server incompleta: manca ${missing.join(" e ")}.`,
        },
        { status: 500 },
      ),
    };
  }

  return {
    ok: true,
    convex: new ConvexHttpClient(convexUrl),
    credentials: {
      secret,
      clerkOrgId: who.organizationId,
      actorUserId: who.userId,
    },
    ...who,
  };
}

/**
 * L'indirizzo pubblico del gestionale, per i link che escono (le mail).
 *
 * Non `request.url`: dietro Railway è l'indirizzo interno del container
 * (`http://0.0.0.0:8080`), e un link così non porta da nessuna parte. Vince
 * `NEXT_PUBLIC_DASHBOARD_URL` se c'è; altrimenti l'host che il proxy dice di
 * aver ricevuto, come fa il login; in locale resta la richiesta.
 */
export function publicOrigin(request: Request): string {
  // Su Railway è scritta senza protocollo (`dashboard.asdpadelsport.com`):
  // senza, `new URL` la leggerebbe come un percorso.
  const configured = process.env.NEXT_PUBLIC_DASHBOARD_URL?.trim();
  if (configured) {
    try {
      return new URL(
        /^https?:\/\//.test(configured) ? configured : `https://${configured}`,
      ).origin;
    } catch {
      // Valore non valido: si passa alle intestazioni del proxy.
    }
  }

  // Dietro più proxy le intestazioni sono elenchi: conta il primo, il client.
  const first = (name: string) =>
    request.headers.get(name)?.split(",")[0]?.trim() || null;
  const host = first("x-forwarded-host");
  if (host) return `${first("x-forwarded-proto") ?? "https"}://${host}`;

  return new URL(request.url).origin;
}
