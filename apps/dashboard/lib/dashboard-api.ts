import "server-only";

import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { isStaffMember } from "@/lib/staff";

/**
 * Guardia comune alle route di configurazione della dashboard.
 *
 * Il controllo vero è qui: Convex non sa chi è lo staff — quello lo sa Clerk,
 * attraverso l'organizzazione. Le mutation di configurazione si difendono con
 * un segreto condiviso, che senza questa guardia non basterebbe: è la stessa
 * doppia protezione dell'elenco iscritti agli eventi.
 */
export type StaffGate =
  | { ok: false; response: NextResponse }
  | {
      ok: true;
      convex: ConvexHttpClient;
      secret: string;
      /** Chi dello staff sta chiedendo: serve a firmare quello che fa. */
      userId: string;
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

  if (!(await isStaffMember(userId))) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Questo account non fa parte dello staff." },
        { status: 403 },
      ),
    };
  }

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

  return { ok: true, convex: new ConvexHttpClient(convexUrl), secret, userId };
}
