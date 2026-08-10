import { api } from "@padel-sport/backend/convex/_generated/api";
import { render } from "@react-email/render";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { SupportRequestClubEmail } from "@/emails/support-request-club";
import { SupportRequestCopyEmail } from "@/emails/support-request-copy";
import {
  formatSupportDate,
  SUPPORT_HOURS,
  supportRequestSchema,
} from "@/lib/support-request";

const CLUB_INBOX =
  process.env.SUPPORT_REQUEST_INBOX ?? "support@asdpadelsport.com";
const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";

export async function POST(request: Request) {
  const parsed = supportRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json(
      { error: "I dati inviati non sono validi." },
      { status: 400 },
    );
  }

  const values = parsed.data;

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile. Riprova più tardi." },
      { status: 500 },
    );
  }

  // Il salvataggio è la fonte di verità: se fallisce, la richiesta non esiste
  // e l'utente deve saperlo. Le mail vengono dopo.
  let requestId: string;
  try {
    const convex = new ConvexHttpClient(convexUrl);
    requestId = await convex.mutation(
      api.modules.supportRequests.create.default,
      {
        name: values.name,
        email: values.email,
        phone: values.phone,
        memberId: values.memberId,
        message: values.message,
      },
    );
  } catch (error) {
    console.error("Salvataggio della richiesta di supporto fallito:", error);
    return NextResponse.json(
      { error: "Non siamo riusciti a registrare la richiesta. Riprova." },
      { status: 502 },
    );
  }

  const receivedAtLabel = formatSupportDate(Date.now());

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // La richiesta è salvata: meglio un avviso nei log che un errore all'utente.
    console.error("RESEND_API_KEY non configurata: nessuna mail inviata.");
    return NextResponse.json({ id: requestId, notified: false });
  }

  let notified = false;
  try {
    const resend = new Resend(apiKey);

    const [clubHtml, copyHtml] = await Promise.all([
      render(
        SupportRequestClubEmail({
          name: values.name,
          email: values.email,
          phone: values.phone,
          memberId: values.memberId,
          message: values.message,
          receivedAtLabel,
        }),
      ),
      render(
        SupportRequestCopyEmail({
          name: values.name,
          email: values.email,
          phone: values.phone,
          memberId: values.memberId,
          message: values.message,
          receivedAtLabel,
          supportHours: SUPPORT_HOURS,
        }),
      ),
    ]);

    const results = await resend.batch.send([
      {
        from: FROM,
        to: [CLUB_INBOX],
        replyTo: values.email,
        subject: `Supporto: ${values.name}${values.memberId ? ` (socio ${values.memberId})` : ""}`,
        html: clubHtml,
      },
      {
        from: FROM,
        to: [values.email],
        replyTo: CLUB_INBOX,
        subject: "Abbiamo ricevuto la tua richiesta di assistenza",
        html: copyHtml,
      },
    ]);

    if (results.error) {
      throw results.error;
    }

    notified = true;
  } catch (error) {
    // Mai far fallire la risposta per una mail: la richiesta è già a database.
    console.error("Invio delle mail di supporto fallito:", error);
  }

  if (notified) {
    try {
      const convex = new ConvexHttpClient(convexUrl);
      await convex.mutation(api.modules.supportRequests.markNotified.default, {
        id: requestId as never,
      });
    } catch (error) {
      console.error("Impossibile segnare la richiesta come notificata:", error);
    }
  }

  return NextResponse.json({ id: requestId, notified });
}
