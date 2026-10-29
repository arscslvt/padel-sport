import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { PointsExitRequestEmail } from "@/emails/points-exit-request";
import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";
import { formatClubDate } from "@/lib/points";
import { siteUrl } from "@/lib/site";

/**
 * Manda al cliente la mail per uscire dal programma punti. Solo staff.
 *
 * Non lo fa uscire: l'uscita vale solo quando la persona la conferma dalla
 * pagina del link (packages/backend/convex/modules/points/exit.ts). Lo staff
 * non ha altro modo per toglierle il programma, così nessuno perde i punti
 * senza saperlo.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

/** Il token del link: casuale, e l'unica cosa che protegge la conferma. */
function exitToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;

  const client = await gate.convex
    .query(api.modules.clients.list.detail, {
      ...gate.credentials,
      playerId: playerId as Id<"players">,
    })
    .catch(() => null);

  if (!client) {
    return NextResponse.json({ error: "Scheda non trovata." }, { status: 404 });
  }

  const email = client.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      {
        error:
          "Questa scheda non ha un'email. Aggiungila per mandare la richiesta di uscita.",
      },
      { status: 400 },
    );
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(
      "RESEND_API_KEY non configurata: richiesta di uscita non spedita.",
    );
    return NextResponse.json(
      { error: "Invio delle mail non configurato." },
      { status: 500 },
    );
  }

  const token = exitToken();

  let request: { firstName: string; balance: number; expiresAt: number };
  try {
    request = await gate.convex.mutation(
      api.modules.points.exit.requestByEmail,
      {
        ...gate.credentials,
        playerId: playerId as Id<"players">,
        token,
        email,
        sentByClerkUserId: gate.userId,
      },
    );
  } catch (error) {
    console.error("Richiesta di uscita non registrata:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a registrare la richiesta.") },
      { status: 400 },
    );
  }

  try {
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: FROM,
      to: [email],
      replyTo: CLUB_INBOX,
      subject: "Conferma la tua uscita dal programma punti",
      html: await render(
        PointsExitRequestEmail({
          firstName: request.firstName,
          exitUrl: siteUrl(`/points-exit/${token}`),
          balance: request.balance,
          expiresLabel: formatClubDate(request.expiresAt),
        }),
      ),
    });

    if (error) throw error;
  } catch (error) {
    // La richiesta registrata senza mail non fa danni: senza il link nessuno
    // può confermarla, e scade da sola. Lo staff deve però saperlo.
    console.error("Mail di uscita non spedita:", error);
    return NextResponse.json(
      { error: "La mail non è partita. Riprova fra poco." },
      { status: 502 },
    );
  }

  return NextResponse.json({ sent: true, email, expiresAt: request.expiresAt });
}
