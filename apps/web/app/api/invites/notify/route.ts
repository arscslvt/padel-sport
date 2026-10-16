import { clerkClient } from "@clerk/nextjs/server";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { MatchInviteEmail } from "@/emails/match-invite";
import { formatClubDay, formatClubSlotRange } from "@/lib/booking";
import { SITE_URL } from "@/lib/booking-links";

/**
 * La mail d'invito a una partita, a chi è stato chiamato per nome da chi ha
 * prenotato dall'area personale. Gemella del WhatsApp d'invito: partono
 * insieme da Convex (modules/notifications/matchInvite.ts).
 *
 * La chiama Convex con il segreto condiviso, come gli avvisi delle
 * prenotazioni (app/api/bookings/notify): il destinatario non arriva mai dal
 * browser. La risposta riporta l'id di Resend, che Convex scrive nel registro
 * degli avvisi per seguirne la consegna.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

const payloadSchema = z.object({
  inviteId: z.string().min(1),
  recipientName: z.string(),
  email: z.string().optional(),
  clerkUserId: z.string().optional(),
  inviterName: z.string(),
  start: z.number(),
  court: z.string().optional(),
  players: z.array(z.string()),
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

  const invite = parsed.data;

  // Chi ha un account ha l'indirizzo su Clerk; la copia in anagrafica vale
  // per chi non ce l'ha ancora.
  let email = invite.email;
  if (invite.clerkUserId) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(invite.clerkUserId);
      email = user.primaryEmailAddress?.emailAddress ?? email;
    } catch (error) {
      console.error("Email dell'invitato non recuperata:", error);
    }
  }

  if (!email) {
    return NextResponse.json({ skipped: "Nessun indirizzo email" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata: invito non spedito.");
    return NextResponse.json({
      email,
      error: "Invio delle mail non configurato",
    });
  }

  const dayLabel = formatClubDay(invite.start);
  const timeLabel = formatClubSlotRange(invite.start);

  try {
    const send = await new Resend(apiKey).emails.send({
      from: FROM,
      to: [email],
      replyTo: CLUB_INBOX,
      subject: `${invite.inviterName} ti invita a giocare: ${dayLabel}, ${timeLabel}`,
      html: await render(
        MatchInviteEmail({
          recipientName: invite.recipientName,
          inviterName: invite.inviterName,
          dayLabel,
          timeLabel,
          court: invite.court,
          players: invite.players,
          inviteUrl: `${SITE_URL}/invite/${invite.inviteId}`,
        }),
      ),
    });

    if (send.error) {
      console.error("Mail d'invito non spedita:", send.error);
      return NextResponse.json({ email, error: send.error.message });
    }

    return NextResponse.json({ email, id: send.data?.id });
  } catch (error) {
    console.error("Mail d'invito non spedita:", error);
    return NextResponse.json(
      { email, error: "Invio della mail non riuscito." },
      { status: 502 },
    );
  }
}
