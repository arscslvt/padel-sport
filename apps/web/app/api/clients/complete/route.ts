import { auth, clerkClient } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";

/**
 * Il cliente chiude la propria iscrizione.
 *
 * Non è una route da staff: qui l'autorizzazione è la sessione della persona
 * stessa, aperta un attimo prima con il codice via mail. Il token dell'invito
 * dice *quale* invito si sta usando; la sessione dice *chi* lo sta usando, e i
 * due devono corrispondere — altrimenti basterebbe il link, che può finire
 * inoltrato a chiunque.
 */

const bodySchema = z.object({
  token: z.string().min(10),
  firstName: z.string().trim().min(2).max(60),
  lastName: z.string().trim().min(2).max(60),
  phone: z.string().trim().min(6).max(30),
  birthDate: z.number(),
  gender: z.enum(["f", "m", "other", "unspecified"]),
  level: z.number().min(1).max(5),
  consents: z.object({
    marketing: z.boolean(),
    newsletter: z.boolean(),
    tracking: z.boolean(),
  }),
  taxCode: z.string().trim().max(16).optional(),
  residence: z
    .object({
      address: z.string().trim().max(120).optional(),
      city: z.string().trim().max(80).optional(),
      postalCode: z
        .string()
        .trim()
        .regex(/^\d{5}$/, "Il CAP deve essere di cinque cifre.")
        .optional()
        .or(z.literal("")),
    })
    .optional(),
  health: z
    .object({
      allergies: z.string().trim().max(500).optional(),
      conditions: z.string().trim().max(500).optional(),
      disability: z.string().trim().max(500).optional(),
    })
    .optional(),
  // `clubNotes` non è qui di proposito: sono note che lo staff scrive per sé.
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Verifica prima il tuo indirizzo email." },
      { status: 401 },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Controlla i dati inseriti: qualcosa non torna." },
      { status: 400 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.BOOKING_WEBHOOK_SECRET;

  if (!convexUrl || !secret) {
    const missing = [
      convexUrl ? null : "NEXT_PUBLIC_CONVEX_URL",
      secret ? null : "BOOKING_WEBHOOK_SECRET",
    ].filter(Boolean);

    console.error(`Iscrizione non completata: manca ${missing.join(" e ")}.`);
    return NextResponse.json(
      { error: "Servizio non disponibile: riprova fra poco." },
      { status: 500 },
    );
  }

  // Mail e foto restano di Clerk: le leggiamo da lì invece di fidarci del
  // browser, che potrebbe mandarci l'indirizzo di qualcun altro.
  let email: string | undefined;
  let avatarUrl: string | undefined;

  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress;
    avatarUrl = user.hasImage ? user.imageUrl : undefined;
  } catch (error) {
    console.error("Profilo Clerk non letto:", error);
  }

  if (!email) {
    return NextResponse.json(
      { error: "Il tuo account non ha un indirizzo email verificato." },
      { status: 400 },
    );
  }

  const { token, consents, ...profile } = parsed.data;

  try {
    await new ConvexHttpClient(convexUrl).mutation(
      api.modules.clients.profile.complete,
      {
        secret,
        token,
        clerkUserId: userId,
        email,
        avatarUrl,
        ...profile,
        consents: { ...consents, updatedAt: Date.now() },
      },
    );

    return NextResponse.json({ completed: true });
  } catch (error) {
    console.error("Iscrizione non completata:", error);
    return NextResponse.json(
      {
        error: convexMessage(
          error,
          "Non siamo riusciti a completare l'iscrizione.",
        ),
      },
      { status: 400 },
    );
  }
}
