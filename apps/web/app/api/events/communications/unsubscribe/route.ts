import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { ConvexError } from "convex/values";
import { NextResponse } from "next/server";

import { communicationUnsubscribeSchema } from "@/lib/event-communications";

/**
 * Smette di mandare comunicazioni su un evento a chi lo chiede dal link in
 * fondo alla mail.
 *
 * POST e non GET per la stessa ragione documentata in `events/rsvp/cancel`: i
 * client di posta precaricano gli indirizzi che trovano nel corpo — SafeLinks
 * di Outlook, i proxy di Gmail — e una disiscrizione raggiungibile in GET
 * scatterebbe da sola prima ancora che la mail venga aperta.
 *
 * **Non annulla l'iscrizione**: chi si toglie dalle mail all'evento ci viene
 * lo stesso, e il posto resta suo.
 */
export async function POST(request: Request) {
  const parsed = communicationUnsubscribeSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json({ error: "Link non valido." }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile. Riprova più tardi." },
      { status: 500 },
    );
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const result = await convex.mutation(
      api.modules.eventRsvps.unsubscribe.default,
      { token: parsed.data.token },
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ConvexError) {
      const data = error.data as { code?: string; message?: string };
      return NextResponse.json(
        { error: data?.message ?? "Link non valido." },
        { status: data?.code === "not_found" ? 404 : 409 },
      );
    }

    console.error("Disiscrizione fallita:", error);
    return NextResponse.json(
      { error: "Non siamo riusciti a registrare la disiscrizione. Riprova." },
      { status: 502 },
    );
  }
}
