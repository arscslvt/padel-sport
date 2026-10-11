import { clerkClient } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import {
  AccountStatusEmail,
  type AccountStatusEmailProps,
} from "@/emails/account-status";
import { SITE_URL } from "@/lib/booking-links";
import { convexMessage, staffClerkUserIds } from "@/lib/clients";
import { type StaffGate, staffGate } from "@/lib/dashboard-api";
import { getInfo } from "@/lib/info";
import { PERSONAL_AREA_LINK } from "@/lib/links";
import { formatClubDate } from "@/lib/points";

/**
 * Sospende l'account di un cliente (POST) o lo riattiva (DELETE).
 *
 * Le metà sono due e devono andare d'accordo: Convex tiene il motivo e
 * congela i punti, Clerk chiude davvero l'accesso — un ban chiude anche le
 * sessioni aperte, sul sito come nell'app. Prima Convex, che valida e dice no
 * quando c'è da dire no; poi Clerk, e se Clerk non risponde si rimette Convex
 * com'era. Per ultima la mail, che è una cortesia: se non parte, la
 * sospensione resta valida e lo staff lo sa dalla risposta.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

const suspendSchema = z.object({
  reason: z.string().trim().min(10).max(1000),
});

type Ready = Extract<StaffGate, { ok: true }>;

interface MailFacts {
  firstName: string;
  email?: string;
  clerkUserId?: string;
  points: number;
  redemptions: { title: string; code: string; expiresAt?: number }[];
  reason?: string;
}

/** Recapiti per il reclamo: gli stessi del sito. */
function contacts(): AccountStatusEmailProps["contacts"] {
  const whatsapp = (getInfo("whatsapp") ?? "").replace(/\D/g, "");
  const text = "Ciao, vi scrivo per la sospensione del mio account.";

  return {
    email: getInfo("email") ?? CLUB_INBOX,
    phone: getInfo("cell") ?? "",
    whatsappUrl: `https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`,
  };
}

/** Manda la mail. Torna falso se non è partita, senza far fallire la richiesta. */
async function notify(
  kind: "suspended" | "reactivated",
  facts: MailFacts,
): Promise<boolean> {
  // Per chi si è registrato dall'app l'indirizzo vive solo su Clerk. Un ban
  // non lo nasconde: l'utente resta lì, solo non può entrare.
  let email = facts.email;
  if (!email && facts.clerkUserId) {
    try {
      const clerk = await clerkClient();
      const user = await clerk.users.getUser(facts.clerkUserId);
      email = user.primaryEmailAddress?.emailAddress;
    } catch (error) {
      console.error("Email del cliente non recuperata:", error);
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!email || !apiKey) {
    if (!apiKey) console.error("RESEND_API_KEY non configurata.");
    return false;
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: FROM,
      to: [email],
      // Il reclamo più semplice è rispondere: deve arrivare a chi lo legge.
      replyTo: CLUB_INBOX,
      subject:
        kind === "suspended"
          ? "Il tuo account è stato sospeso"
          : "Il tuo account è di nuovo attivo",
      html: await render(
        AccountStatusEmail({
          kind,
          firstName: facts.firstName,
          points: facts.points,
          reason: facts.reason,
          redemptions: facts.redemptions.map((row) => ({
            title: row.title,
            code: row.code,
            expiresLabel: row.expiresAt
              ? formatClubDate(row.expiresAt)
              : undefined,
          })),
          contacts: contacts(),
          walletUrl: `${SITE_URL}${PERSONAL_AREA_LINK}`,
        }),
      ),
    });

    if (error) {
      console.error("Mail sull'account non spedita:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Mail sull'account non spedita:", error);
    return false;
  }
}

async function readClient(gate: Ready, playerId: string) {
  return await gate.convex
    .query(api.modules.clients.list.detail, {
      secret: gate.secret,
      playerId: playerId as Id<"players">,
    })
    .catch(() => null);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;
  const parsed = suspendSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Scrivi il motivo della sospensione (almeno 10 caratteri): il cliente lo leggerà nella mail.",
      },
      { status: 400 },
    );
  }

  const client = await readClient(gate, playerId);
  if (!client) {
    return NextResponse.json({ error: "Scheda non trovata." }, { status: 404 });
  }

  const clerkUserId = client.clerkUserId;
  if (!clerkUserId) {
    return NextResponse.json(
      { error: "Questa scheda non ha un account da sospendere." },
      { status: 400 },
    );
  }

  // Sospendere chi lavora al club vorrebbe dire chiudergli la dashboard: si
  // toglie prima dall'organizzazione, se è davvero quello che si vuole.
  if (
    clerkUserId === gate.userId ||
    (await staffClerkUserIds()).includes(clerkUserId)
  ) {
    return NextResponse.json(
      { error: "Questo è un account dello staff: non si sospende da qui." },
      { status: 400 },
    );
  }

  let facts: MailFacts;
  try {
    facts = await gate.convex.mutation(api.modules.clients.suspension.suspend, {
      secret: gate.secret,
      playerId: playerId as Id<"players">,
      reason: parsed.data.reason,
      suspendedByClerkUserId: gate.userId,
    });
  } catch (error) {
    console.error("Sospensione non salvata su Convex:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a sospendere l'account.") },
      { status: 400 },
    );
  }

  try {
    const clerk = await clerkClient();
    await clerk.users.banUser(clerkUserId);
  } catch (error) {
    console.error("Ban su Clerk non riuscito:", error);

    await gate.convex
      .mutation(api.modules.clients.suspension.reactivate, {
        secret: gate.secret,
        playerId: playerId as Id<"players">,
      })
      .catch((rollback) =>
        console.error("Sospensione non annullata su Convex:", rollback),
      );

    return NextResponse.json(
      {
        error:
          "Non sono riuscito a bloccare l'accesso: l'account resta attivo. Riprova fra poco.",
      },
      { status: 502 },
    );
  }

  const mailed = await notify("suspended", facts);
  return NextResponse.json({ suspended: true, mailed });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ playerId: string }> },
) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const { playerId } = await params;

  const client = await readClient(gate, playerId);
  if (!client) {
    return NextResponse.json({ error: "Scheda non trovata." }, { status: 404 });
  }

  const previous = client.suspension;

  let facts: MailFacts;
  try {
    facts = await gate.convex.mutation(
      api.modules.clients.suspension.reactivate,
      { secret: gate.secret, playerId: playerId as Id<"players"> },
    );
  } catch (error) {
    console.error("Riattivazione non salvata su Convex:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco a riattivare l'account.") },
      { status: 400 },
    );
  }

  if (client.clerkUserId) {
    try {
      const clerk = await clerkClient();
      await clerk.users.unbanUser(client.clerkUserId);
    } catch (error) {
      console.error("Riapertura su Clerk non riuscita:", error);

      if (previous) {
        await gate.convex
          .mutation(api.modules.clients.suspension.restore, {
            secret: gate.secret,
            playerId: playerId as Id<"players">,
            suspension: previous,
          })
          .catch((rollback) =>
            console.error("Sospensione non ripristinata su Convex:", rollback),
          );
      }

      return NextResponse.json(
        {
          error:
            "Non sono riuscito a riaprire l'accesso: l'account resta sospeso. Riprova fra poco.",
        },
        { status: 502 },
      );
    }
  }

  const mailed = await notify("reactivated", facts);
  return NextResponse.json({ reactivated: true, mailed });
}
