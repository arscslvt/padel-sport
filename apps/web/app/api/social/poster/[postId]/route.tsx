import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { FeedPoster, StoryPoster } from "@/components/poster/poster";
import { posterFonts } from "@/lib/poster/fonts";
import { FEED_SIZE, STORY_SIZE } from "@/lib/poster/theme";
import { urlFor } from "@/sanity/image";

/**
 * La locandina di un contenuto, come immagine.
 *
 * È pubblica di necessità: Instagram non accetta il caricamento dei byte, vuole
 * un indirizzo da cui scaricarseli, e a quell'indirizzo arriva senza alcuna
 * nostra credenziale. Stesso mestiere del QR di una prenotazione — un'immagine
 * per un consumatore esterno, validata prima di essere prodotta — e stesse
 * precauzioni.
 *
 * Tre difese, e servono tutte e tre:
 *
 * 1. la query di Convex restituisce **solo le proprietà di disegno**. I fatti
 *    dati al modello, la firma di chi ha approvato, la chiave del trigger non
 *    escono da questo sistema, e non escono perché non vengono nemmeno letti;
 * 2. il `token` accompagna ogni richiesta: gli `_id` di Convex non sono un
 *    segreto, e una bozza non ancora approvata non è contenuto pubblico;
 * 3. l'immagine è dichiarata immutabile, e correggere una bozza rigenera il
 *    token. L'indirizzo vecchio smette di esistere invece di servire una
 *    versione superata.
 *
 * La domanda da farsi rileggendo questo file: se questo indirizzo finisse su
 * Twitter, cosa si vedrebbe? Esattamente l'immagine che stiamo per pubblicare.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ postId: string }> },
) {
  const { postId } = await params;
  const token = new URL(request.url).searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      { error: "Indirizzo non valido." },
      { status: 400 },
    );
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
    const poster = await convex.query(api.modules.social.poster.default, {
      // Il cast è il confine fra un pezzo di indirizzo e un identificatore: se
      // non corrisponde a nulla la query restituisce `null`, che è il caso già
      // gestito qui sotto.
      postId: postId as Id<"socialPosts">,
      token,
    });

    // Riga assente, token sbagliato o locandina non ancora composta: la stessa
    // risposta per tutti e tre, perché distinguerli direbbe a chi prova
    // indirizzi a caso quali esistono.
    if (!poster) {
      return NextResponse.json(
        { error: "Locandina non trovata." },
        { status: 404 },
      );
    }

    const size = poster.format === "story" ? STORY_SIZE : FEED_SIZE;

    // Lo sfondo si ritaglia alla misura esatta della tela: satori scala le
    // immagini con `background-size`, ma far viaggiare un originale da quattro
    // megapixel per poi coprirlo di velatura è tempo speso a scaricare.
    const backgroundUrl = poster.backgroundAssetRef
      ? urlFor({ _ref: poster.backgroundAssetRef })
          .width(size.width)
          .height(size.height)
          .fit("crop")
          .url()
      : undefined;

    return new ImageResponse(
      poster.format === "story" ? (
        <StoryPoster spec={poster.spec} backgroundUrl={backgroundUrl} />
      ) : (
        <FeedPoster spec={poster.spec} backgroundUrl={backgroundUrl} />
      ),
      {
        ...size,
        fonts: await posterFonts(),
        headers: {
          // La locandina di un token non cambia mai: correggerla ne crea uno
          // nuovo. Vale la pena che stia in cache ovunque, a partire dalla CDN
          // che Meta interrogherà.
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      },
    );
  } catch (error) {
    console.error("Generazione della locandina fallita:", error);
    return NextResponse.json(
      { error: "Non riesco a generare la locandina." },
      { status: 502 },
    );
  }
}
