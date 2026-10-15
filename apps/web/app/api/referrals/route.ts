import { randomBytes } from "node:crypto";
import { auth } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { render } from "@react-email/render";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { ReferralInviteEmail } from "@/emails/referral-invite";
import { SITE_URL } from "@/lib/booking-links";
import { convexMessage } from "@/lib/clients";
import { convexSessionToken } from "@/lib/convex-token";

/**
 * Un cliente invita un amico a iscriversi: Convex registra l'invito
 * (modules/referrals/invite.ts), qui parte la mail.
 *
 * Il link lo estraiamo noi, a caso: è l'unica cosa che protegge la pagina
 * dell'invito, che si apre senza essere autenticati.
 *
 * Se la mail non parte l'invito resta registrato: l'amico può comunque dare
 * il codice allo sportello, e rimandarlo dall'area personale riprova.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

const payloadSchema = z.object({
  email: z.email(),
  name: z.string().trim().max(60).optional(),
});

export async function POST(request: Request) {
  const parsed = payloadSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Scrivi un indirizzo email valido." },
      { status: 400 },
    );
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Serve l'accesso." }, { status: 401 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const token = await convexSessionToken();
  if (!convexUrl || !token) {
    return NextResponse.json(
      { error: "Servizio non disponibile." },
      { status: 500 },
    );
  }

  const convex = new ConvexHttpClient(convexUrl);
  convex.setAuth(token);

  const inviteToken = randomBytes(24).toString("base64url");

  let invite: Awaited<
    ReturnType<
      typeof convex.mutation<typeof api.modules.referrals.invite.create>
    >
  >;
  try {
    invite = await convex.mutation(api.modules.referrals.invite.create, {
      email: parsed.data.email,
      name: parsed.data.name || undefined,
      token: inviteToken,
    });
  } catch (error) {
    return NextResponse.json(
      { error: convexMessage(error, "Invito non registrato.") },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata: invito non spedito.");
    return NextResponse.json({ sent: false });
  }

  try {
    const html = await render(
      ReferralInviteEmail({
        inviterName: invite.inviterName,
        friendName: invite.name,
        email: invite.email,
        code: invite.code,
        inviteUrl: `${SITE_URL}/amico/${inviteToken}`,
        points: invite.points ?? undefined,
      }),
    );

    const result = await new Resend(apiKey).emails.send({
      from: FROM,
      to: [invite.email],
      replyTo: CLUB_INBOX,
      subject: `${invite.inviterName} ti invita al Padel Sport`,
      html,
    });

    if (result.error) {
      console.error("Invito non spedito:", result.error);
      return NextResponse.json({ sent: false });
    }

    return NextResponse.json({ sent: true, resent: invite.resent });
  } catch (error) {
    console.error("Invito non spedito:", error);
    return NextResponse.json({ sent: false });
  }
}
