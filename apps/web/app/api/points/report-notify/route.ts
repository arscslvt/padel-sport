import { clerkClient } from "@clerk/nextjs/server";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { PointReportUpdateEmail } from "@/emails/point-report-update";
import { SITE_URL } from "@/lib/booking-links";
import { PERSONAL_AREA_LINK } from "@/lib/links";

/**
 * La mail sullo stato di una segnalazione sui punti. La chiama Convex
 * (modules/pointReports/mail.ts) quando lo staff la prende in carico o la
 * risolve dal gestionale.
 *
 * Stessa serratura di `/api/points/notify`: un segreto condiviso con il
 * deployment, perché qui non arriva nessuna sessione.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

const payloadSchema = z.object({
  status: z.enum(["in_progress", "resolved"]),
  firstName: z.string(),
  email: z.string().optional(),
  clerkUserId: z.string().optional(),
  category: z.string(),
  transaction: z.object({ label: z.string(), delta: z.number() }).optional(),
  message: z.string(),
  reply: z.string().optional(),
  balance: z.number(),
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

  // Come per i movimenti: per chi si è registrato dall'app l'indirizzo vive
  // solo sull'account.
  let email = data.email;
  if (!email && data.clerkUserId) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(data.clerkUserId);
      email = user.primaryEmailAddress?.emailAddress;
    } catch (error) {
      console.error("Email del cliente non recuperata:", error);
    }
  }

  if (!email) return NextResponse.json({ notified: 0 });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "RESEND_API_KEY non configurata: mail della segnalazione non inviata.",
    );
    return NextResponse.json({ notified: 0 });
  }

  const subject =
    data.status === "resolved"
      ? "La tua segnalazione sui punti è stata risolta"
      : "Abbiamo preso in carico la tua segnalazione";

  try {
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: FROM,
      to: [email],
      replyTo: CLUB_INBOX,
      subject,
      html: await render(
        PointReportUpdateEmail({
          status: data.status,
          firstName: data.firstName,
          category: data.category,
          transaction: data.transaction,
          message: data.message,
          reply: data.reply,
          balance: data.balance,
          walletUrl: `${SITE_URL}${PERSONAL_AREA_LINK}`,
        }),
      ),
    });

    if (error) {
      console.error("Mail della segnalazione non spedita:", error);
      return NextResponse.json(
        { error: "Invio non riuscito." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Mail della segnalazione non spedita:", error);
    return NextResponse.json({ error: "Invio non riuscito." }, { status: 502 });
  }

  return NextResponse.json({ notified: 1 });
}
