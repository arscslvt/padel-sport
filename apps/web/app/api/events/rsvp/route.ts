import { api } from "@padel-sport/backend/convex/_generated/api";
import { sendHark } from "@padel-sport/backend/convex/utils/hark";
import { staffEventFormUrl } from "@padel-sport/backend/convex/utils/staffLinks";
import { render } from "@react-email/render";
import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { EventRsvpClubEmail } from "@/emails/event-rsvp-club";
import { EventRsvpCopyEmail } from "@/emails/event-rsvp-copy";
import {
  DEFAULT_MAX_GUESTS,
  eventRsvpSchema,
  guestsCount,
  isRsvpClosed,
  MAX_GUESTS_LIMIT,
  rsvpCancelPath,
} from "@/lib/event-rsvp";
import { formatEventDate } from "@/lib/events";
import { EVENTS_LINK } from "@/lib/links";
import { client } from "@/sanity/client";
import { EVENT_RSVP_FORM_QUERY } from "@/sanity/queries";
import type { EventRsvpFormTarget } from "@/sanity/types";

const CLUB_INBOX = process.env.EVENT_RSVP_INBOX ?? "supporto@asdpadelsport.com";
const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const SITE_URL = "https://www.asdpadelsport.com";

/**
 * Rilegge il modulo dal documento pubblicato su Sanity.
 *
 * Il browser manda solo slug e `_key`: posti, scadenza e accompagnatori
 * massimi vengono da qui, perché sono la configurazione decisa dall'editor. Il
 * client Sanity ha `perspective: "published"`, quindi un evento in bozza non
 * raccoglie iscrizioni — che è la cosa giusta: non è ancora online.
 */
async function loadForm(slug: string, key: string) {
  const target = await client.fetch<EventRsvpFormTarget | null>(
    EVENT_RSVP_FORM_QUERY,
    { slug, key },
  );

  return target?.form ? { ...target, form: target.form } : null;
}

function seatsLeftOf(capacity: number | null | undefined, seatsTaken: number) {
  return typeof capacity === "number"
    ? Math.max(capacity - seatsTaken, 0)
    : null;
}

/** Posti rimasti, per mostrarli sotto il modulo. Nessun dato personale. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const key = searchParams.get("key");

  if (!slug || !key) {
    return NextResponse.json({ error: "Parametri mancanti." }, { status: 400 });
  }

  const target = await loadForm(slug, key);
  if (!target) {
    return NextResponse.json({ error: "Modulo non trovato." }, { status: 404 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile." },
      { status: 500 },
    );
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const stats = await convex.query(api.modules.eventRsvps.stats.default, {
      eventId: target._id,
      blockKey: key,
    });

    return NextResponse.json({
      attendees: stats.attendees,
      seatsTaken: stats.seatsTaken,
      capacity: target.form.capacity ?? null,
      seatsLeft: seatsLeftOf(target.form.capacity, stats.seatsTaken),
      closed: isRsvpClosed(target.form.closesAt),
    });
  } catch (error) {
    console.error("Lettura dei posti disponibili fallita:", error);
    return NextResponse.json(
      { error: "Conteggio non disponibile." },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const parsed = eventRsvpSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "I dati inviati non sono validi." },
      { status: 400 },
    );
  }

  const values = parsed.data;
  const guests = guestsCount(values.guests);

  if (guests === null) {
    return NextResponse.json(
      { error: "Il numero di accompagnatori non è valido." },
      { status: 400 },
    );
  }

  const target = await loadForm(values.slug, values.blockKey);
  if (!target) {
    return NextResponse.json(
      { error: "Questo modulo di iscrizione non esiste più." },
      { status: 404 },
    );
  }

  const form = target.form;

  if (isRsvpClosed(form.closesAt)) {
    return NextResponse.json(
      { error: "Le iscrizioni per questo evento sono chiuse." },
      { status: 409 },
    );
  }

  const maxGuests = Math.min(
    form.maxGuests ?? DEFAULT_MAX_GUESTS,
    MAX_GUESTS_LIMIT,
  );

  if (guests > maxGuests) {
    return NextResponse.json(
      {
        error: maxGuests
          ? `Puoi indicare al massimo ${maxGuests} accompagnatori.`
          : "Questo evento non ammette accompagnatori.",
      },
      { status: 400 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile. Riprova più tardi." },
      { status: 500 },
    );
  }

  const convex = new ConvexHttpClient(convexUrl);
  const capacity = form.capacity ?? undefined;

  // Il token dell'annullamento nasce qui e non nella mutation: serve comunque
  // a comporre il link della mail, e il runtime di Convex preferisce restare
  // deterministico.
  const cancelToken = crypto.randomUUID();

  // Il salvataggio è la fonte di verità, e il controllo su duplicati e posti
  // vive dentro la mutation: è transazionale, quindi due iscrizioni simultanee
  // sull'ultimo posto non passano entrambe.
  let rsvpId: string;
  let seatsTaken: number;

  try {
    const result = await convex.mutation(
      api.modules.eventRsvps.create.default,
      {
        eventId: target._id,
        blockKey: values.blockKey,
        eventSlug: target.slug,
        eventTitle: target.title,
        name: values.name,
        email: values.email,
        guests,
        cancelToken,
        capacity,
        maxGuests,
      },
    );

    rsvpId = result.id;
    seatsTaken = result.seatsTaken;
  } catch (error) {
    if (error instanceof ConvexError) {
      const data = error.data as { code?: string; message?: string };

      // Posti esauriti o email già iscritta: il conteggio che ha in mano il
      // browser è vecchio, quindi glielo rimandiamo aggiornato.
      const stats = await convex
        .query(api.modules.eventRsvps.stats.default, {
          eventId: target._id,
          blockKey: values.blockKey,
        })
        .catch(() => null);

      return NextResponse.json(
        {
          error: data?.message ?? "Iscrizione non registrata.",
          code: data?.code,
          seatsTaken: stats?.seatsTaken,
          seatsLeft: stats
            ? seatsLeftOf(capacity, stats.seatsTaken)
            : undefined,
        },
        { status: data?.code === "invalid" ? 400 : 409 },
      );
    }

    console.error("Salvataggio dell'iscrizione fallito:", error);
    return NextResponse.json(
      { error: "Non siamo riusciti a registrare l'iscrizione. Riprova." },
      { status: 502 },
    );
  }

  const seats = guests + 1;
  const seatsLeft = seatsLeftOf(capacity, seatsTaken);
  const eventUrl = `${SITE_URL}${EVENTS_LINK}/${target.slug}`;
  const dateLabel = formatEventDate(target.dateStart, target.dateEnd);

  /*
   * Da qui in poi l'iscrizione è a database: nessun canale di notifica può far
   * fallire la risposta. La push parte prima delle mail perché serve a coprirle
   * — se Resend è giù, il telefono suona lo stesso.
   */
  await sendHark({
    title: `Iscrizione: ${target.title}`,
    body: [
      `${values.name} — ${seats === 1 ? "1 persona" : `${seats} persone`}`,
      `Email: ${values.email}`,
      `Evento: ${dateLabel}`,
      capacity
        ? `Posti: ${seatsTaken}/${capacity}${seatsLeft === 0 ? " — esauriti" : ""}`
        : `Totale iscritti: ${seatsTaken} persone`,
    ].join("\n"),
    url: staffEventFormUrl(target._id, values.blockKey),
    idempotencyKey: `event-rsvp-${rsvpId}`,
  });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // L'iscrizione è salvata: meglio un avviso nei log che un errore all'utente.
    console.error("RESEND_API_KEY non configurata: nessuna mail inviata.");
    return NextResponse.json({
      id: rsvpId,
      seatsTaken,
      seatsLeft,
      notified: false,
    });
  }

  const emailProps = {
    name: values.name,
    eventTitle: target.title,
    eventDateLabel: dateLabel,
    eventUrl,
    guests,
    seats,
  };

  const cancelUrl = `${SITE_URL}${rsvpCancelPath(target.slug, cancelToken)}`;

  let notified = false;

  try {
    const resend = new Resend(apiKey);

    const [clubHtml, copyHtml] = await Promise.all([
      render(
        EventRsvpClubEmail({
          ...emailProps,
          email: values.email,
          seatsTaken,
          capacity: capacity ?? null,
        }),
      ),
      render(EventRsvpCopyEmail({ ...emailProps, cancelUrl })),
    ]);

    const results = await resend.batch.send([
      {
        from: FROM,
        to: [CLUB_INBOX],
        replyTo: values.email,
        subject: `Iscrizione: ${values.name} — ${target.title}`,
        html: clubHtml,
      },
      {
        from: FROM,
        to: [values.email],
        replyTo: CLUB_INBOX,
        subject: `Iscrizione confermata: ${target.title}`,
        html: copyHtml,
      },
    ]);

    if (results.error) {
      throw results.error;
    }

    notified = true;
  } catch (error) {
    // Mai far fallire la risposta per una mail: l'iscrizione è già a database.
    console.error("Invio delle mail di iscrizione fallito:", error);
  }

  if (notified) {
    try {
      await convex.mutation(api.modules.eventRsvps.markNotified.default, {
        id: rsvpId as never,
      });
    } catch (error) {
      console.error("Impossibile segnare l'iscrizione come notificata:", error);
    }
  }

  return NextResponse.json({ id: rsvpId, seatsTaken, seatsLeft, notified });
}
