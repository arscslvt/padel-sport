import { clerkClient } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";

import { staffAdminGate } from "@/lib/dashboard-api";

/**
 * Toglie una persona dallo staff.
 *
 * Esce dall'organizzazione Clerk, e con quello il gestionale le si chiude
 * alla richiesta seguente: ogni pagina e ogni route ricontrollano. L'account
 * resta: chi è anche cliente del club continua a prenotare dal sito e
 * dall'app come prima.
 *
 * I suoi telefoni smettono di ricevere le notifiche dello staff, che portano
 * nomi e orari dei clienti. Se quel passaggio non riesce la persona è
 * comunque fuori, e lo si dice: i dispositivi restano da togliere a mano da
 * Configurazione.
 *
 * Togliere sé stessi non si può: un amministratore resta sempre, ed è chi
 * sta facendo la richiesta.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const gate = await staffAdminGate();
  if (!gate.ok) return gate.response;

  const { userId } = await params;

  if (userId === gate.userId) {
    return NextResponse.json(
      { error: "Non puoi toglierti dallo staff da solo." },
      { status: 400 },
    );
  }

  try {
    const clerk = await clerkClient();
    await clerk.organizations.deleteOrganizationMembership({
      organizationId: gate.organizationId,
      userId,
    });
  } catch (error) {
    console.error("Membro dello staff non rimosso:", error);
    return NextResponse.json(
      { error: "Non riesco a toglierlo dallo staff. Riprova tra poco." },
      { status: 502 },
    );
  }

  let devicesRemoved: number | null = null;
  try {
    devicesRemoved = await gate.convex.mutation(
      api.modules.push.subscriptions.removeForUser,
      { ...gate.credentials, userId },
    );
  } catch (error) {
    console.error("Dispositivi dell'ex staff non rimossi:", error);
  }

  return NextResponse.json({ removed: true, devicesRemoved });
}
