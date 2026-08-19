import { clerkClient } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";

import { ClientInviteEmail } from "@/emails/client-invite";
import { SITE_URL } from "@/lib/booking-links";
import { convexMessage } from "@/lib/clients";
import { staffGate } from "@/lib/dashboard-api";
import { getInfo } from "@/lib/info";

/**
 * Invita il cliente di questa scheda ad aprire il proprio account, o rimanda
 * l'invito a chi non ha ancora risposto.
 *
 * L'account Clerk nasce qui, senza password: è ciò che permette all'invitato di
 * verificarsi con lo stesso codice via mail delle prenotazioni, invece di
 * passare da una registrazione a parte. La scheda esiste già da un pezzo — è
 * questo il momento in cui le si aggancia un modo di accedere.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

/** Il token del link: casuale, e l'unica cosa che protegge l'invito. */
function inviteToken(): string {
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
      secret: gate.secret,
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
          "Questa scheda non ha un indirizzo email: aggiungilo prima di invitare.",
      },
      { status: 400 },
    );
  }

  const clerk = await clerkClient();

  let clerkUserId: string;
  let accountCreatedByInvite = false;

  try {
    // Un account può già esserci: chi si era registrato dall'app prima che
    // l'ingresso diventasse su invito. In quel caso si riusa il suo, e non se
    // ne apre un secondo con la stessa mail — Clerk lo rifiuterebbe comunque.
    const existing = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });

    if (existing.data.length > 0) {
      clerkUserId = existing.data[0].id;

      // Se quell'account è già la porta di un'altra scheda, invitare qui
      // vorrebbe dire far esistere la stessa persona due volte.
      if (client.clerkUserId && client.clerkUserId !== clerkUserId) {
        return NextResponse.json(
          {
            error:
              "Questo indirizzo appartiene a un altro account già collegato: controlla se la persona ha già una scheda.",
          },
          { status: 409 },
        );
      }
    } else {
      const created = await clerk.users.createUser({
        emailAddress: [email],
        firstName: client.firstName ?? undefined,
        lastName: client.lastName ?? undefined,
        skipPasswordRequirement: true,
      });
      clerkUserId = created.id;
      accountCreatedByInvite = true;
    }
  } catch (error) {
    console.error("Account dell'invitato non creato:", error);
    return NextResponse.json(
      {
        error:
          "Non riesco ad aprire l'account per questo indirizzo. Controlla la mail e riprova.",
      },
      { status: 400 },
    );
  }

  const token = inviteToken();

  let sentCount = 1;

  try {
    const result = await gate.convex.mutation(
      api.modules.clients.invites.send,
      {
        secret: gate.secret,
        playerId: playerId as Id<"players">,
        token,
        clerkUserId,
        accountCreatedByInvite,
        invitedByClerkUserId: gate.userId,
      },
    );

    sentCount = result?.sentCount ?? 1;
  } catch (error) {
    console.error("Invito non registrato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a registrare l'invito.") },
      { status: 400 },
    );
  }

  const joinUrl = `${SITE_URL}/join/${token}`;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata: invito non spedito.");
    return NextResponse.json({
      invited: true,
      mailed: false,
      sentCount,
      joinUrl,
    });
  }

  try {
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: FROM,
      to: [email],
      replyTo: CLUB_INBOX,
      subject:
        sentCount > 1
          ? "Il tuo invito al Padel Sport Melilli"
          : "Ti aspettiamo al Padel Sport Melilli",
      html: await render(
        ClientInviteEmail({
          firstName: client.firstName ?? client.name,
          joinUrl,
          phone: getInfo("cell") ?? "",
          isReminder: sentCount > 1,
        }),
      ),
    });

    if (error) {
      console.error("Mail di invito non spedita:", error);
      return NextResponse.json({
        invited: true,
        mailed: false,
        sentCount,
        joinUrl,
      });
    }
  } catch (error) {
    console.error("Mail di invito non spedita:", error);
    return NextResponse.json({
      invited: true,
      mailed: false,
      sentCount,
      joinUrl,
    });
  }

  return NextResponse.json({ invited: true, mailed: true, sentCount, joinUrl });
}

/**
 * Annulla l'invito. La scheda resta, l'account si stacca — e si chiude, se
 * l'avevamo aperto noi e nessuno l'ha mai usato: un account che sopravvive alla
 * revoca sarebbe un modo di entrare che il club crede di aver tolto.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;

  try {
    const result = await gate.convex.mutation(
      api.modules.clients.invites.revoke,
      { secret: gate.secret, playerId: playerId as Id<"players"> },
    );

    if (result?.deleteAccount && result.clerkUserId) {
      try {
        const clerk = await clerkClient();
        await clerk.users.deleteUser(result.clerkUserId);
      } catch (error) {
        // L'invito è comunque annullato: l'account orfano è un fastidio, non
        // una porta aperta, perché la scheda non è più collegata.
        console.error("Account dell'invito non cancellato:", error);
      }
    }

    return NextResponse.json({ revoked: true });
  } catch (error) {
    console.error("Invito non annullato:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad annullare l'invito.") },
      { status: 400 },
    );
  }
}
