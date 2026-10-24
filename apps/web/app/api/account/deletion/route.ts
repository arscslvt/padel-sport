import { clerkClient } from "@clerk/nextjs/server";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { AccountDeletionEmail } from "@/emails/account-deletion";
import { SITE_URL } from "@/lib/booking-links";
import { PERSONAL_AREA_LINK } from "@/lib/links";
import { formatClubDate } from "@/lib/points";

/**
 * L'eliminazione dell'account, dal lato del sito. La chiama Convex
 * (modules/clients/deletion.ts), con lo stesso segreto di `/api/points/notify`.
 *
 * - `requested`: parte la cancellazione controllata. Solo la mail, con la data
 *   e il link per annullarla.
 * - `deleted`: l'eliminazione è effettiva. Qui si cancella l'utente Clerk, che
 *   solo il sito sa toccare, e poi si avvisa la persona. L'indirizzo si legge
 *   prima di cancellare: dopo non c'è più.
 *
 * Se Clerk non risponde la richiesta fallisce, e Convex riprova: un account
 * che il club crede eliminato non deve restare aperto.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

const payloadSchema = z.object({
  kind: z.enum(["requested", "deleted"]),
  firstName: z.string(),
  email: z.string().optional(),
  clerkUserId: z.string().optional(),
  effectiveAt: z.number().optional(),
});

export async function POST(request: Request) {
  const secret = process.env.BOOKING_WEBHOOK_SECRET;
  if (!secret) {
    console.error("BOOKING_WEBHOOK_SECRET non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile." },
      { status: 500 },
    );
  }

  if (request.headers.get("x-booking-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "Dati non validi." }, { status: 400 });
  }

  const data = parsed.data;
  const clerk = await clerkClient();

  let email = data.email;
  if (!email && data.clerkUserId) {
    try {
      const user = await clerk.users.getUser(data.clerkUserId);
      email = user.primaryEmailAddress?.emailAddress;
    } catch (error) {
      // Già cancellato da un tentativo precedente: niente indirizzo, si va avanti.
      console.error("Email del cliente non recuperata:", error);
    }
  }

  if (data.kind === "deleted" && data.clerkUserId) {
    try {
      await clerk.users.deleteUser(data.clerkUserId);
    } catch (error) {
      const status = (error as { status?: number }).status;
      // 404: l'utente non c'è già più, che è quel che volevamo.
      if (status !== 404) {
        console.error("Utente Clerk non cancellato:", error);
        return NextResponse.json(
          { error: "Utente non cancellato." },
          { status: 502 },
        );
      }
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!email || !apiKey) {
    if (!apiKey) console.error("RESEND_API_KEY non configurata.");
    return NextResponse.json({ done: true, notified: 0 });
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: FROM,
      to: [email],
      replyTo: CLUB_INBOX,
      subject:
        data.kind === "requested"
          ? "Abbiamo ricevuto la richiesta di eliminare il tuo account"
          : "Il tuo account è stato eliminato",
      html: await render(
        AccountDeletionEmail({
          kind: data.kind,
          firstName: data.firstName,
          effectiveLabel: data.effectiveAt
            ? formatClubDate(data.effectiveAt)
            : undefined,
          profileUrl: `${SITE_URL}${PERSONAL_AREA_LINK}/profilo`,
        }),
      ),
    });
    // La mail è una cortesia: l'eliminazione resta fatta anche se non parte.
    if (error) console.error("Mail sull'eliminazione non spedita:", error);
  } catch (error) {
    console.error("Mail sull'eliminazione non spedita:", error);
  }

  return NextResponse.json({ done: true, notified: 1 });
}
