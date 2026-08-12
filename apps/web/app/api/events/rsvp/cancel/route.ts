import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { ConvexError } from "convex/values";
import { NextResponse } from "next/server";
import { z } from "zod";

import { seatsLabel } from "@/lib/event-rsvp";
import { sendNtfyAlert } from "@/lib/ntfy";

const cancelSchema = z.object({
  token: z.string().min(8),
});

/**
 * Annulla un'iscrizione dal link ricevuto per mail.
 *
 * È un POST e non un GET perché il link nella mail porta a una pagina di
 * conferma: i client di posta precaricano gli indirizzi che trovano nel corpo
 * (SafeLinks di Outlook, i proxy di Gmail), e un annullamento raggiungibile in
 * GET si attiverebbe da solo prima ancora che l'utente apra la mail.
 */
export async function POST(request: Request) {
  const parsed = cancelSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Link di annullamento non valido." },
      { status: 400 },
    );
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile. Riprova più tardi." },
      { status: 500 },
    );
  }

  let result: FunctionReturnType<typeof api.modules.eventRsvps.cancel.default>;

  try {
    const convex = new ConvexHttpClient(convexUrl);
    result = await convex.mutation(api.modules.eventRsvps.cancel.default, {
      token: parsed.data.token,
    });
  } catch (error) {
    if (error instanceof ConvexError) {
      const data = error.data as { code?: string; message?: string };
      return NextResponse.json(
        { error: data?.message ?? "Iscrizione non trovata." },
        { status: data?.code === "not_found" ? 404 : 409 },
      );
    }

    console.error("Annullamento dell'iscrizione fallito:", error);
    return NextResponse.json(
      { error: "Non siamo riusciti ad annullare l'iscrizione. Riprova." },
      { status: 502 },
    );
  }

  // Un posto che si libera interessa alla segreteria quanto uno che si occupa:
  // la push parte solo al primo annullamento, non ai clic successivi.
  if (!result.alreadyCancelled) {
    await sendNtfyAlert({
      title: `Iscrizione annullata: ${result.eventTitle}`,
      message: [
        `${result.name} non partecipa più.`,
        `${seatsLabel(result.seats)} tornati disponibili.`,
        `Email: ${result.email}`,
      ].join("\n"),
      tags: ["event-rsvp", "cancelled"],
    });
  }

  return NextResponse.json({
    ok: true,
    alreadyCancelled: result.alreadyCancelled,
  });
}
