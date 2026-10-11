import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { ConvexError } from "convex/values";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { renderCommunication } from "@/lib/communication-render";
import { staffGate } from "@/lib/dashboard-api";
import {
  communicationSendSchema,
  communicationUnsubscribePath,
  UNSUBSCRIBE_TOKEN_PLACEHOLDER,
} from "@/lib/event-communications";
import { client } from "@/sanity/client";
import { COMMUNICATION_BY_ID_QUERY } from "@/sanity/queries";
import type { EventCommunicationDocument } from "@/sanity/types";

const CLUB_INBOX = process.env.EVENT_RSVP_INBOX ?? "supporto@asdpadelsport.com";
const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const SITE_URL = "https://www.asdpadelsport.com";

/** Quante mail accetta Resend in una sola chiamata a `batch.send`. */
const BATCH_SIZE = 100;

/**
 * Pausa fra un blocco e il successivo.
 *
 * Il limite predefinito di Resend è due richieste al secondo: senza questa,
 * una lista da qualche centinaio di persone si farebbe rifiutare a metà — e
 * metà lista servita è il peggiore degli esiti.
 */
const BATCH_PAUSE_MS = 600;

function chunk<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

/**
 * Manda una comunicazione agli iscritti a un modulo di un evento.
 *
 * L'ordine dei passaggi non è casuale:
 *
 * 1. il documento si rilegge da Sanity, perché il browser manda solo un `_id`
 *    e il testo di una mail non può venire da chi la sta chiedendo — stesso
 *    principio di `loadForm` nella route delle iscrizioni;
 * 2. il lucchetto si prende **prima** di spedire, così un doppio clic o un
 *    retry non mandano la stessa mail due volte;
 * 3. l'HTML si compone una volta sola e per ogni destinatario cambia solo il
 *    token del link di disiscrizione;
 * 4. ogni blocco accettato lascia una riga di consegna per destinatario, che è
 *    quel che permette al prossimo invio di rivolgersi ai soli nuovi iscritti.
 */
export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = communicationSendSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const { id, blockKey, allowResend } = parsed.data;
  const audience = parsed.data.audience ?? "all";

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata.");
    return NextResponse.json(
      { error: "Invio delle email non configurato su questo ambiente." },
      { status: 500 },
    );
  }

  const document = await client
    .fetch<EventCommunicationDocument | null>(COMMUNICATION_BY_ID_QUERY, { id })
    .catch(() => null);

  if (!document?.event) {
    return NextResponse.json(
      {
        error:
          "Questa comunicazione non esiste più, o il suo evento non è pubblicato.",
      },
      { status: 404 },
    );
  }

  const event = document.event;

  if (!event.forms?.some((form) => form._key === blockKey)) {
    return NextResponse.json(
      { error: "Questo modulo di iscrizione non esiste più sull'evento." },
      { status: 400 },
    );
  }

  let recipients: {
    id: Id<"eventRsvps">;
    name: string;
    email: string;
    cancelToken: string;
  }[];

  try {
    recipients = await gate.convex.query(
      api.modules.eventRsvps.recipients.default,
      {
        secret: gate.secret,
        eventId: event._id,
        blockKey,
        documentId: document._id,
        audience,
      },
    );
  } catch (error) {
    console.error("Destinatari non recuperati:", error);
    return NextResponse.json(
      { error: "Non riesco a leggere l'elenco dei destinatari." },
      { status: 502 },
    );
  }

  if (!recipients.length) {
    return NextResponse.json(
      {
        error:
          audience === "pending"
            ? "Nessun nuovo iscritto: l'hanno già ricevuta tutti."
            : "Nessun iscritto da raggiungere: non c'è niente da mandare.",
      },
      { status: 409 },
    );
  }

  // Il lucchetto. Da qui in poi l'invio è impegnato: se qualcosa va storto
  // dopo, la riga si chiude con l'esito, non sparisce.
  let sendId: Id<"eventCommunications">;

  try {
    const begun = await gate.convex.mutation(
      api.modules.eventCommunications.begin.default,
      {
        secret: gate.secret,
        documentId: document._id,
        eventId: event._id,
        blockKey,
        eventTitle: event.title,
        subject: document.subject,
        recipients: recipients.length,
        sentBy: gate.userId,
        allowResend,
        audience,
      },
    );

    sendId = begun.id;
  } catch (error) {
    if (error instanceof ConvexError) {
      const data = error.data as { code?: string; message?: string };
      return NextResponse.json(
        { error: data?.message ?? "Invio non consentito.", code: data?.code },
        { status: 409 },
      );
    }

    console.error("Impossibile aprire l'invio:", error);
    return NextResponse.json(
      { error: "Non riesco ad avviare l'invio." },
      { status: 502 },
    );
  }

  const unsubscribeUrl = `${SITE_URL}${communicationUnsubscribePath(
    event.slug,
    UNSUBSCRIBE_TOKEN_PLACEHOLDER,
  )}`;

  const resend = new Resend(apiKey);
  const batches = chunk(recipients, BATCH_SIZE);

  let delivered = 0;
  let failed = 0;
  let firstError: string | undefined;

  try {
    const template = await renderCommunication(document, unsubscribeUrl);

    for (const [index, batch] of batches.entries()) {
      if (index > 0) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_PAUSE_MS));
      }

      try {
        const result = await resend.batch.send(
          batch.map((recipient) => ({
            from: FROM,
            to: [recipient.email],
            replyTo: CLUB_INBOX,
            subject: document.subject,
            html: template.replaceAll(
              UNSUBSCRIBE_TOKEN_PLACEHOLDER,
              recipient.cancelToken,
            ),
          })),
        );

        if (result.error) throw result.error;

        delivered += batch.length;

        // Subito, non alla fine: se l'invio si interrompe fra un blocco e
        // l'altro, quel che è partito resta segnato e il tentativo successivo
        // riparte da chi manca davvero.
        try {
          await gate.convex.mutation(
            api.modules.eventCommunications.recordDeliveries.default,
            {
              secret: gate.secret,
              communicationId: sendId,
              documentId: document._id,
              blockKey,
              recipients: batch.map((recipient) => ({
                rsvpId: recipient.id,
                email: recipient.email,
              })),
            },
          );
        } catch (error) {
          // Le mail sono partite comunque: perderne la traccia significa solo
          // che questi destinatari risulteranno ancora fra i mancanti.
          console.error("Consegne non registrate:", error);
        }
      } catch (error) {
        // Un blocco che fallisce non ferma gli altri: chi si può ancora
        // raggiungere va raggiunto, e il conto di chi è rimasto fuori finisce
        // nello storico.
        console.error("Blocco di comunicazioni non inviato:", error);
        failed += batch.length;
        firstError ??=
          error instanceof Error ? error.message : "Errore sconosciuto.";
      }
    }
  } catch (error) {
    console.error("Composizione della comunicazione fallita:", error);
    failed = recipients.length;
    firstError = error instanceof Error ? error.message : "Errore sconosciuto.";
  }

  try {
    await gate.convex.mutation(
      api.modules.eventCommunications.complete.default,
      { secret: gate.secret, id: sendId, delivered, failed, error: firstError },
    );
  } catch (error) {
    // La mail è partita: un timestamp mancante non deve diventare un errore in
    // faccia a chi ha appena premuto invio.
    console.error("Impossibile chiudere l'invio:", error);
  }

  if (delivered === 0) {
    return NextResponse.json(
      {
        error: "Nessuna mail è partita. Riprova fra qualche minuto.",
        delivered,
        failed,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    delivered,
    failed,
    recipients: recipients.length,
  });
}
