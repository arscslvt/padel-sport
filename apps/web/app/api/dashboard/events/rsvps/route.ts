import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { render } from "@react-email/render";
import { ConvexError } from "convex/values";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { EventRsvpCopyEmail } from "@/emails/event-rsvp-copy";
import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";
import { rsvpCancelPath, STAFF_MAX_GUESTS } from "@/lib/event-rsvp";
import { loadRsvpForm, seatsLeftOf } from "@/lib/event-rsvp-form";
import { formatEventDate } from "@/lib/events";
import { EVENTS_LINK } from "@/lib/links";

/**
 * Gli iscritti a un modulo di un evento, così come li gestisce la segreteria:
 * leggerli, aggiungerne, correggerne gli accompagnatori, spuntare gli arrivi,
 * annullarne.
 *
 * Nomi e indirizzi email di persone: la sola presenza di una sessione non
 * bastava — «essere loggati» lo è anche il cliente accanto, che non ha titolo
 * per leggere chi altro si è iscritto.
 *
 * Scrivendo, la configurazione del modulo si rilegge sempre da Sanity: il
 * browser manda lo slug e la `_key`, la capienza la decide l'editor. La
 * scadenza invece qui non si guarda mai, ed è il punto di queste due rotte —
 * «iscrizioni chiuse» ferma il modulo del sito, non la segreteria.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.EVENT_RSVP_INBOX ?? "supporto@asdpadelsport.com";
const SITE_URL = "https://www.asdpadelsport.com";

/**
 * Un errore di Convex tradotto in risposta.
 *
 * Il `code` viaggia fino al browser perché la dashboard ci fa una cosa sola ma
 * importante: con `full` non si è sbagliato niente — la capienza è finita, e
 * chi sta al banco può passarci sopra ripremendo il tasto. Gli altri codici
 * sono errori veri, e il messaggio arriva già scritto dalla mutation.
 */
function rsvpFailure(error: unknown, fallback: string) {
  if (error instanceof ConvexError) {
    const data = error.data as {
      code?: string;
      message?: string;
      seatsLeft?: number;
    };

    const status =
      data?.code === "invalid" ? 400 : data?.code === "not_found" ? 404 : 409;

    return NextResponse.json(
      {
        error: data?.message ?? fallback,
        code: data?.code,
        seatsLeft: data?.seatsLeft,
      },
      { status },
    );
  }

  console.error(`${fallback}:`, error);
  return NextResponse.json(
    { error: convexMessage(error, fallback) },
    { status: 502 },
  );
}

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  const blockKey = searchParams.get("key");

  if (!eventId || !blockKey) {
    return NextResponse.json({ error: "Parametri mancanti." }, { status: 400 });
  }

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
    console.error("Iscrizioni non recuperate:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a leggere le iscrizioni.") },
      { status: 502 },
    );
  }
}

const createSchema = z.object({
  slug: z.string().min(1),
  blockKey: z.string().min(1),
  name: z.string().trim().min(2),
  email: z.email(),
  guests: z.number().int().min(0).max(STAFF_MAX_GUESTS),
  /** Manda a chi si iscrive la conferma con il link per annullare. */
  notify: z.boolean().optional(),
  /** Iscrive anche oltre la capienza: la seconda pressione sul tasto. */
  override: z.boolean().optional(),
});

/**
 * La copia di conferma a chi è stato iscritto dalla segreteria.
 *
 * Solo la sua: la mail al club esiste per avvisare che è arrivata
 * un'iscrizione, e qui a iscrivere è stato il club. Stessa ragione per la
 * notifica push, che da qui non parte — squillerebbe nella tasca di chi ha
 * appena premuto il tasto.
 *
 * Non è cortesia: dentro c'è il link per annullare, che è l'unico modo che ha
 * la persona di tirarsi indietro da sola, senza telefonare a nessuno.
 *
 * Non solleva mai. L'iscrizione a questo punto è già salvata, e una mail che
 * non parte non deve trasformarla in un errore: la dashboard lo dice, e chi
 * sta al banco sa che quella persona il link non ce l'ha.
 */
async function sendConfirmation(values: {
  name: string;
  email: string;
  guests: number;
  cancelToken: string;
  target: Awaited<ReturnType<typeof loadRsvpForm>>;
}) {
  const { target } = values;
  if (!target) return false;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata: nessuna mail inviata.");
    return false;
  }

  try {
    const html = await render(
      EventRsvpCopyEmail({
        name: values.name,
        eventTitle: target.title,
        eventDateLabel: formatEventDate(target.dateStart, target.dateEnd),
        eventUrl: `${SITE_URL}${EVENTS_LINK}/${target.slug}`,
        guests: values.guests,
        seats: values.guests + 1,
        cancelUrl: `${SITE_URL}${rsvpCancelPath(target.slug, values.cancelToken)}`,
      }),
    );

    const result = await new Resend(apiKey).emails.send({
      from: FROM,
      to: [values.email],
      replyTo: CLUB_INBOX,
      subject: `Iscrizione confermata: ${target.title}`,
      html,
    });

    if (result.error) throw result.error;

    return true;
  } catch (error) {
    console.error("Invio della conferma fallito:", error);
    return false;
  }
}

/**
 * Iscrive qualcuno dal banco.
 *
 * Il gemello della route pubblica, con due differenze che sono tutto il motivo
 * per cui esiste: non guarda la scadenza — dopo la chiusura arrivano le
 * telefonate, e finora l'unica risposta possibile era «no» — e la capienza la
 * chiede invece di imporla, perché a decidere se la sedia in più si trova è
 * chi ha la sala davanti agli occhi.
 *
 * La mail di conferma è facoltativa e la sceglie chi compila: per chi si
 * iscrive al telefono vale la pena, per chi è già davanti al banco la sera
 * dell'evento è una notifica che arriva a cose fatte.
 */
export async function POST(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const values = parsed.data;
  const target = await loadRsvpForm(values.slug, values.blockKey);

  if (!target) {
    return NextResponse.json(
      { error: "Questo modulo di iscrizione non esiste più." },
      { status: 404 },
    );
  }

  const capacity = target.form.capacity ?? undefined;
  // Come nella route pubblica: il token nasce qui perché serve comunque a
  // comporre il link della mail, e Convex preferisce restare deterministico.
  const cancelToken = crypto.randomUUID();

  let id: Id<"eventRsvps">;
  let seatsTaken: number;

  try {
    const result = await gate.convex.mutation(
      api.modules.eventRsvps.create.byStaff,
      {
        secret: gate.secret,
        eventId: target._id,
        blockKey: values.blockKey,
        eventSlug: target.slug,
        eventTitle: target.title,
        name: values.name,
        email: values.email,
        guests: values.guests,
        cancelToken,
        capacity,
        override: values.override,
      },
    );

    id = result.id;
    seatsTaken = result.seatsTaken;
  } catch (error) {
    return rsvpFailure(error, "Non riesco a registrare l'iscrizione.");
  }

  const notified = values.notify
    ? await sendConfirmation({
        name: values.name,
        email: values.email,
        guests: values.guests,
        cancelToken,
        target,
      })
    : false;

  if (notified) {
    try {
      await gate.convex.mutation(api.modules.eventRsvps.markNotified.default, {
        id,
      });
    } catch (error) {
      console.error("Impossibile segnare l'iscrizione come notificata:", error);
    }
  }

  return NextResponse.json({
    id,
    seatsTaken,
    seatsLeft: seatsLeftOf(capacity, seatsTaken),
    notified,
  });
}

const guestsSchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  blockKey: z.string().min(1),
  guests: z.number().int().min(0).max(STAFF_MAX_GUESTS),
  override: z.boolean().optional(),
});

/**
 * Cambia quanti accompagnatori porta un'iscrizione.
 *
 * Separata dalla `PATCH` degli arrivi di proposito, anche se scrive la stessa
 * riga: quella è l'appello alla cassa e arriva a raffica, questa è una
 * correzione singola e deliberata. Averle sullo stesso verbo vorrebbe dire un
 * corpo che significa due cose diverse a seconda dei campi che porta.
 */
export async function PUT(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = guestsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const values = parsed.data;
  const target = await loadRsvpForm(values.slug, values.blockKey);

  if (!target) {
    return NextResponse.json(
      { error: "Questo modulo di iscrizione non esiste più." },
      { status: 404 },
    );
  }

  const capacity = target.form.capacity ?? undefined;

  try {
    const result = await gate.convex.mutation(
      api.modules.eventRsvps.update.default,
      {
        secret: gate.secret,
        id: values.id as Id<"eventRsvps">,
        eventId: target._id,
        blockKey: values.blockKey,
        guests: values.guests,
        capacity,
        override: values.override,
      },
    );

    return NextResponse.json({
      id: result.id,
      guests: result.guests,
      seats: result.guests + 1,
      seatsTaken: result.seatsTaken,
      seatsLeft: seatsLeftOf(capacity, result.seatsTaken),
    });
  } catch (error) {
    return rsvpFailure(error, "Non riesco a cambiare gli accompagnatori.");
  }
}

const checkInSchema = z.object({
  entries: z
    .array(
      z.object({
        id: z.string().min(1),
        arrived: z.boolean(),
        guests: z.array(z.number().int().min(0)),
      }),
    )
    .min(1)
    .max(500),
});

/**
 * Le spunte della lista arrivi, a gruppi.
 *
 * Arriva lo stato intero delle righe toccate, non un «accendi questa casella»:
 * chi è in cassa spunta a raffica e il client accumula, così l'ultima
 * scrittura vince e non c'è ordine di arrivo da rispettare.
 */
export async function PATCH(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = checkInSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(
      api.modules.eventRsvps.checkIn.default,
      {
        secret: gate.secret,
        entries: parsed.data.entries.map((entry) => ({
          ...entry,
          id: entry.id as Id<"eventRsvps">,
        })),
      },
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Arrivi non registrati:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a registrare gli arrivi.") },
      { status: 400 },
    );
  }
}

const cancelSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  try {
    const result = await gate.convex.mutation(
      api.modules.eventRsvps.cancel.byStaff,
      { secret: gate.secret, id: parsed.data.id as Id<"eventRsvps"> },
    );

    return NextResponse.json({ cancelled: true, rsvp: result });
  } catch (error) {
    console.error("Iscrizione non annullata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad annullare l'iscrizione.") },
      { status: 400 },
    );
  }
}
