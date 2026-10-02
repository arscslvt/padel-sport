import { clerkClient } from "@clerk/nextjs/server";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { PointsUpdateEmail } from "@/emails/points-update";
import { SITE_URL } from "@/lib/booking-links";
import { PERSONAL_AREA_LINK } from "@/lib/links";
import { formatClubDate, pointsLabel } from "@/lib/points";

/**
 * La mail che segue un movimento di punti. La chiama Convex
 * (modules/points/mail.ts) dopo ogni carico, rimozione o riscatto.
 *
 * Stessa serratura di `/api/bookings/notify`: un segreto condiviso con il
 * deployment, perché qui non arriva nessuna sessione — il movimento può
 * nascere dalla dashboard come dal cliente stesso.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

const payloadSchema = z.object({
  firstName: z.string(),
  email: z.string().optional(),
  clerkUserId: z.string().optional(),
  delta: z.number(),
  label: z.string(),
  note: z.string().optional(),
  balance: z.number(),
  redemption: z
    .object({
      title: z.string(),
      code: z.string(),
      terms: z.string().optional(),
      expiresAt: z.number().optional(),
    })
    .optional(),
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

  // La scheda può non avere l'indirizzo scritto qui: per chi si è registrato
  // dall'app vive solo sull'account.
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
      "RESEND_API_KEY non configurata: mail dei punti non inviata.",
    );
    return NextResponse.json({ notified: 0 });
  }

  const amount = pointsLabel(data.delta);

  const subject = data.redemption
    ? `Premio riscattato: ${data.redemption.title}`
    : data.delta > 0
      ? `Hai ricevuto ${amount}`
      : `Ti sono stati tolti ${amount}`;

  try {
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: FROM,
      to: [email],
      replyTo: CLUB_INBOX,
      subject,
      html: await render(
        PointsUpdateEmail({
          firstName: data.firstName,
          delta: data.delta,
          label: data.label,
          note: data.note,
          balance: data.balance,
          walletUrl: `${SITE_URL}${PERSONAL_AREA_LINK}`,
          redemption: data.redemption
            ? {
                title: data.redemption.title,
                code: data.redemption.code,
                terms: data.redemption.terms,
                expiresLabel: data.redemption.expiresAt
                  ? formatClubDate(data.redemption.expiresAt)
                  : undefined,
              }
            : undefined,
        }),
      ),
    });

    if (error) {
      console.error("Mail dei punti non spedita:", error);
      return NextResponse.json(
        { error: "Invio non riuscito." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("Mail dei punti non spedita:", error);
    return NextResponse.json({ error: "Invio non riuscito." }, { status: 502 });
  }

  return NextResponse.json({ notified: 1 });
}
