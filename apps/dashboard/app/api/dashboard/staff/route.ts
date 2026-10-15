import { clerkClient } from "@clerk/nextjs/server";
import { render } from "@react-email/render";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

import { StaffInviteEmail } from "@/emails/staff-invite";
import { SIGN_IN_PATH } from "@/lib/auth-routes";
import { staffAdminGate } from "@/lib/dashboard-api";
import { STAFF_ADMIN_ROLE, STAFF_ROLES } from "@/lib/staff";

/**
 * Chi è nello staff, per gli amministratori.
 *
 * Lo staff è l'organizzazione Clerk e nient'altro: Convex non ne tiene una
 * copia, quindi aggiungere o togliere qualcuno qui è tutto quello che serve
 * perché il gestionale gli si apra o gli si chiuda, alla richiesta seguente.
 *
 * GET elenca, POST aggiunge (aprendo l'account se l'email non ne ha uno),
 * la rimozione sta in `[userId]/route.ts`.
 */

const FROM =
  process.env.EMAIL_FROM ?? "Padel Sport Melilli <noreply@asdpadelsport.com>";
const CLUB_INBOX = process.env.BOOKING_INBOX ?? "supporto@asdpadelsport.com";

export async function GET() {
  const gate = await staffAdminGate();
  if (!gate.ok) return gate.response;

  try {
    const clerk = await clerkClient();
    const memberships = await clerk.organizations.getOrganizationMembershipList(
      { organizationId: gate.organizationId, limit: 100 },
    );

    const members = memberships.data
      .map((membership) => {
        const user = membership.publicUserData;
        const name = [user?.firstName, user?.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();

        return {
          userId: user?.userId ?? "",
          name: name || user?.identifier || "Senza nome",
          email: user?.identifier ?? null,
          imageUrl: user?.imageUrl ?? null,
          isAdmin: membership.role === STAFF_ADMIN_ROLE,
          isYou: user?.userId === gate.userId,
          since: membership.createdAt,
        };
      })
      .filter((member) => member.userId)
      // Prima gli amministratori, poi in ordine di nome.
      .sort(
        (a, b) =>
          Number(b.isAdmin) - Number(a.isAdmin) ||
          a.name.localeCompare(b.name, "it"),
      );

    return NextResponse.json({ members });
  } catch (error) {
    console.error("Staff non letto da Clerk:", error);
    return NextResponse.json(
      { error: "Non riesco a leggere lo staff. Riprova tra poco." },
      { status: 502 },
    );
  }
}

const inviteSchema = z.object({
  email: z.email().transform((email) => email.trim().toLowerCase()),
  firstName: z.string().trim().min(1).max(60),
  lastName: z.string().trim().max(60).optional(),
  role: z.enum(STAFF_ROLES),
});

export async function POST(request: Request) {
  const gate = await staffAdminGate();
  if (!gate.ok) return gate.response;

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Controlla email e nome, e riprova." },
      { status: 400 },
    );
  }

  const { email, firstName, lastName, role } = parsed.data;
  const clerk = await clerkClient();

  // L'account si riusa se c'è: chi è già cliente del club entra nello staff
  // con il suo, e non se ne apre un secondo con la stessa mail.
  let userId: string;
  let created = false;
  let name = firstName;

  try {
    const existing = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1,
    });
    const user = existing.data[0];

    if (user) {
      const membership =
        await clerk.organizations.getOrganizationMembershipList({
          organizationId: gate.organizationId,
          userId: [user.id],
          limit: 1,
        });

      if (membership.data.length > 0) {
        return NextResponse.json(
          { error: "Questa persona è già nello staff." },
          { status: 409 },
        );
      }

      userId = user.id;
      name = user.firstName || firstName;
    } else {
      // Senza password, come gli inviti dei clienti: si entra con il codice
      // via mail, lo stesso del login del gestionale.
      const fresh = await clerk.users.createUser({
        emailAddress: [email],
        firstName,
        lastName: lastName || undefined,
        skipPasswordRequirement: true,
      });
      userId = fresh.id;
      created = true;
    }
  } catch (error) {
    console.error("Account per lo staff non trovato né creato:", error);
    return NextResponse.json(
      {
        error:
          "Non riesco ad aprire l'account per questo indirizzo. Controlla la mail e riprova.",
      },
      { status: 400 },
    );
  }

  try {
    await clerk.organizations.createOrganizationMembership({
      organizationId: gate.organizationId,
      userId,
      role,
    });
  } catch (error) {
    // Un account aperto per niente non deve restare: lo si chiude, così
    // un nuovo tentativo riparte pulito.
    if (created) {
      await clerk.users.deleteUser(userId).catch((cleanupError) => {
        console.error("Account orfano non rimosso:", cleanupError);
      });
    }

    console.error("Membro dello staff non aggiunto:", error);
    return NextResponse.json(
      { error: "Non riesco ad aggiungerlo allo staff. Riprova tra poco." },
      { status: 502 },
    );
  }

  const signInUrl = new URL(SIGN_IN_PATH, request.url).toString();
  const mailed = await sendWelcome({
    to: email,
    firstName: name,
    invitedBy: await inviterName(gate.userId),
    signInUrl,
    isAdmin: role === STAFF_ADMIN_ROLE,
  });

  return NextResponse.json({ added: true, created, mailed, signInUrl });
}

/** Il nome di chi aggiunge, per la mail: «Salvatore ti ha aggiunto». */
async function inviterName(userId: string): Promise<string> {
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    return user.firstName || "Il club";
  } catch {
    return "Il club";
  }
}

/**
 * La mail di benvenuto. Se non parte la persona è comunque nello staff: lo
 * si dice a chi l'ha aggiunta, che può girarle il link a voce.
 */
async function sendWelcome({
  to,
  firstName,
  invitedBy,
  signInUrl,
  isAdmin,
}: {
  to: string;
  firstName: string;
  invitedBy: string;
  signInUrl: string;
  isAdmin: boolean;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY non configurata: benvenuto non spedito.");
    return false;
  }

  try {
    const { error } = await new Resend(apiKey).emails.send({
      from: FROM,
      to: [to],
      replyTo: CLUB_INBOX,
      subject: "Sei nello staff del Padel Sport Melilli",
      html: await render(
        StaffInviteEmail({
          firstName,
          invitedBy,
          signInUrl,
          email: to,
          isAdmin,
        }),
      ),
    });

    if (error) {
      console.error("Benvenuto nello staff non spedito:", error);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Benvenuto nello staff non spedito:", error);
    return false;
  }
}
