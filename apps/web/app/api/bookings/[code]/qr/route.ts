import { api } from "@padel-sport/backend/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import { NextResponse } from "next/server";

import { bookingQrPng } from "@/lib/booking-qr";

/**
 * Immagine del QR di una prenotazione.
 *
 * Sta in una route e non in un data URI perché è la mail il consumatore
 * principale, e Gmail scarta le immagini inline: serve un indirizzo assoluto.
 *
 * Il codice viene verificato prima di generare l'immagine, così un indirizzo
 * inventato risponde 404 invece di produrre un QR che non porta da nessuna
 * parte. Il contenuto è pubblico per definizione — è un QR da mostrare
 * all'ingresso — ma non rivela nulla di più della pagina a cui punta.
 *
 * Esiste solo per le prenotazioni confermate: il QR *è* la conferma, e uno
 * generabile prima insegnerebbe a presentarsi in struttura senza aspettare il
 * via libera. Questo è l'unico posto in cui la regola va applicata, perché è
 * l'unico da cui l'immagine esce.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const normalized = code.trim().toUpperCase();

  if (!/^[A-Z0-9]{4,12}$/.test(normalized)) {
    return NextResponse.json({ error: "Codice non valido." }, { status: 400 });
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    console.error("NEXT_PUBLIC_CONVEX_URL non configurata.");
    return NextResponse.json(
      { error: "Servizio non disponibile." },
      { status: 500 },
    );
  }

  try {
    const convex = new ConvexHttpClient(convexUrl);
    const booking = await convex.query(api.bookings.getByCode.default, {
      code: normalized,
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Prenotazione non trovata." },
        { status: 404 },
      );
    }

    if (booking.status !== "accepted_on_site_payment") {
      return NextResponse.json(
        { error: "Prenotazione non ancora confermata." },
        { status: 409 },
      );
    }

    const png = await bookingQrPng(normalized);

    return new NextResponse(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        // Il QR di un codice non cambia mai: vale la pena tenerlo in cache
        // anche nei proxy dei client di posta.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Generazione del QR fallita:", error);
    return NextResponse.json(
      { error: "Non riesco a generare il QR." },
      { status: 502 },
    );
  }
}
