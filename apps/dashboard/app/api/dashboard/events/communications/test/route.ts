import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { renderCommunication } from "@/lib/communication-render";
import { staffGate } from "@/lib/dashboard-api";
import {
  communicationTestSchema,
  communicationUnsubscribePath,
} from "@/lib/event-communications";
import { client } from "@/sanity/client";
import { COMMUNICATION_BY_ID_QUERY } from "@/sanity/queries";
import type { EventCommunicationDocument } from "@/sanity/types";

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const SITE_URL = "https://www.asdpadelsport.com";

/**
 * Manda la comunicazione soltanto a chi la sta preparando.
 *
 * Serve perché nessuna anteprima dice davvero come esce una mail: Gmail
 * riscrive gli stili, Outlook ignora metà del CSS, e sul telefono la colonna è
 * un'altra. L'unico modo di saperlo è riceverla.
 *
 * Non lascia traccia su Convex: una prova non è un invio, e non deve entrare
 * nello storico né consumare il lucchetto che protegge quello vero.
 */
export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = communicationTestSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata.");
    return NextResponse.json(
      { error: "Invio delle email non configurato su questo ambiente." },
      { status: 500 },
    );
  }

  const clerk = await clerkClient();
  const user = await clerk.users.getUser(gate.userId);
  const to =
    user.emailAddresses.find(
      (address) => address.id === user.primaryEmailAddressId,
    )?.emailAddress ?? user.emailAddresses[0]?.emailAddress;

  if (!to) {
    return NextResponse.json(
      { error: "Il tuo account non ha un indirizzo email a cui mandarla." },
      { status: 400 },
    );
  }

  try {
    const document = await client.fetch<EventCommunicationDocument | null>(
      COMMUNICATION_BY_ID_QUERY,
      { id: parsed.data.id },
    );

    if (!document?.event) {
      return NextResponse.json(
        { error: "Comunicazione non trovata." },
        { status: 404 },
      );
    }

    // Token finto ma link vero: così la prova ha la stessa forma della mail
    // definitiva. Aprirlo non disiscrive nessuno — non corrisponde a nessuna
    // iscrizione, e la pagina dice che il link non è valido.
    const unsubscribeUrl = `${SITE_URL}${communicationUnsubscribePath(
      document.event.slug,
      "prova-non-valida",
    )}`;

    const html = await renderCommunication(document, unsubscribeUrl);

    const result = await new Resend(apiKey).emails.send({
      from: FROM,
      to: [to],
      subject: `[PROVA] ${document.subject}`,
      html,
    });

    if (result.error) throw result.error;

    return NextResponse.json({ sent: true, to });
  } catch (error) {
    console.error("Invio di prova fallito:", error);
    return NextResponse.json(
      { error: "Non sono riuscito a mandare la prova." },
      { status: 502 },
    );
  }
}
