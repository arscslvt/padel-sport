import { auth, clerkClient } from "@clerk/nextjs/server";
import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";
import { z } from "zod";

import { convexMessage } from "@/lib/clients";

/**
 * Il cambio d'email dall'area personale, lato server.
 *
 * L'email è l'identità su Clerk: la verifica con il codice la fa il browser
 * con Clerk stesso (profile-form.tsx). Qui passano solo i due momenti che non
 * si possono lasciare al browser:
 *
 * - `check`, prima di chiedere il codice: l'indirizzo non deve essere già
 *   sulla scheda di un'altra persona;
 * - `sync`, dopo la verifica: l'indirizzo si rilegge da Clerk e si ricopia
 *   sulla scheda. Mai quello mandato dal browser, che potrebbe essere di
 *   chiunque.
 */

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("check"), email: z.string().trim().email() }),
  z.object({ action: z.literal("sync") }),
]);

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Accedi di nuovo." }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Indirizzo email non valido." },
      { status: 400 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  const secret = process.env.BOOKING_WEBHOOK_SECRET;
  if (!convexUrl || !secret) {
    console.error(
      "Cambio email non disponibile: manca NEXT_PUBLIC_CONVEX_URL o BOOKING_WEBHOOK_SECRET.",
    );
    return NextResponse.json(
      { error: "Servizio non disponibile: riprova fra poco." },
      { status: 500 },
    );
  }

  const convex = new ConvexHttpClient(convexUrl);

  if (parsed.data.action === "check") {
    try {
      const { available } = await convex.query(
        api.modules.clients.self.emailAvailable,
        { secret, clerkUserId: userId, email: parsed.data.email },
      );
      return NextResponse.json({ available });
    } catch (error) {
      console.error("Controllo email non riuscito:", error);
      return NextResponse.json(
        {
          error: convexMessage(error, "Non riesco a controllare l'indirizzo."),
        },
        { status: 502 },
      );
    }
  }

  let email: string | undefined;
  try {
    const clerk = await clerkClient();
    const user = await clerk.users.getUser(userId);
    email = user.primaryEmailAddress?.emailAddress;
  } catch (error) {
    console.error("Profilo Clerk non letto:", error);
  }

  if (!email) {
    return NextResponse.json(
      { error: "Il tuo account non ha un indirizzo email verificato." },
      { status: 400 },
    );
  }

  try {
    await convex.mutation(api.modules.clients.self.syncEmail, {
      secret,
      // Chi chiede, per la manutenzione: un amministratore lavora lo stesso.
      actorUserId: userId,
      clerkUserId: userId,
      email,
    });
    return NextResponse.json({ email });
  } catch (error) {
    console.error("Email non ricopiata sulla scheda:", error);
    return NextResponse.json(
      { error: convexMessage(error, "Non riesco ad aggiornare la scheda.") },
      { status: 400 },
    );
  }
}
