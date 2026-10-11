import { api } from "@padel-sport/backend/convex/_generated/api";
import { NextResponse } from "next/server";

import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";
import { client } from "@/sanity/client";
import { COMMUNICATIONS_QUERY } from "@/sanity/queries";
import type { EventCommunicationSummary } from "@/sanity/types";

/** Una comunicazione appena pubblicata deve comparire subito: mai dalla cache. */
export const dynamic = "force-dynamic";

/**
 * Quel che serve alla console di invio: le comunicazioni pronte, quante
 * persone raggiungerebbero, cosa è già stato mandato e chi non l'ha ancora
 * ricevuto.
 *
 * Elenchi separati invece di un oggetto già composto: la pagina li incrocia da
 * sé, e tenerli distinti evita di rifare qui la forma che serve alla UI — che
 * cambia più spesso dei dati.
 */
export async function GET() {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  try {
    const all =
      await client.fetch<EventCommunicationSummary[]>(COMMUNICATIONS_QUERY);

    // Un evento spubblicato dallo Studio lascia la comunicazione senza
    // destinatari possibili: si scarta, non c'è niente da mandare.
    const communications = all.filter((entry) => entry.event);

    // I moduli si ripetono quando più comunicazioni puntano allo stesso
    // evento: chiederne i conteggi una volta sola.
    const forms = [
      ...new Map(
        communications.flatMap((entry) =>
          (entry.event?.forms ?? []).map((form) => [
            `${entry.event?._id}:${form._key}`,
            { eventId: entry.event?._id as string, blockKey: form._key },
          ]),
        ),
      ).values(),
    ];

    // I destinatari mancanti dipendono dalla coppia comunicazione+modulo, non
    // dal solo modulo: la stessa lista di iscritti può avere già ricevuto una
    // comunicazione e non un'altra.
    const targets = communications.flatMap((entry) =>
      (entry.event?.forms ?? []).map((form) => ({
        documentId: entry._id,
        eventId: entry.event?._id as string,
        blockKey: form._key,
      })),
    );

    const [counts, sends, pending] = await Promise.all([
      forms.length
        ? gate.convex.query(api.modules.eventRsvps.recipientCounts.default, {
            secret: gate.secret,
            forms,
          })
        : [],
      communications.length
        ? gate.convex.query(api.modules.eventCommunications.list.default, {
            secret: gate.secret,
            documentIds: communications.map((entry) => entry._id),
          })
        : [],
      targets.length
        ? gate.convex.query(
            api.modules.eventCommunications.pendingCounts.default,
            { secret: gate.secret, targets },
          )
        : [],
    ]);

    return NextResponse.json({ communications, counts, sends, pending });
  } catch (error) {
    console.error("Comunicazioni non recuperate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere le comunicazioni.") },
      { status: 502 },
    );
  }
}
