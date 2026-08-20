import { NextResponse } from "next/server";

import { renderCommunication } from "@/lib/communication-render";
import { staffGate } from "@/lib/dashboard-api";
import { client } from "@/sanity/client";
import { COMMUNICATION_BY_ID_QUERY } from "@/sanity/queries";
import type { EventCommunicationDocument } from "@/sanity/types";

export const dynamic = "force-dynamic";

/**
 * L'HTML di una comunicazione, per l'anteprima nella console.
 *
 * Risponde `text/html` perché la pagina la mostra dentro un iframe: è l'unico
 * modo di vederla con gli stili che avrà davvero, senza che quelli della
 * dashboard le finiscano addosso.
 *
 * Il link di disiscrizione è inerte: qui si guarda, non si agisce.
 */
export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Parametro mancante." }, { status: 400 });
  }

  try {
    const document = await client.fetch<EventCommunicationDocument | null>(
      COMMUNICATION_BY_ID_QUERY,
      { id },
    );

    if (!document) {
      return NextResponse.json(
        { error: "Comunicazione non trovata." },
        { status: 404 },
      );
    }

    const html = await renderCommunication(document, "#");

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Anteprima della comunicazione fallita:", error);
    return NextResponse.json(
      { error: "Non riesco a comporre l'anteprima." },
      { status: 502 },
    );
  }
}
