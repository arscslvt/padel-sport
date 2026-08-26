import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

import { FeedPoster, StoryPoster } from "@/components/poster/poster";
import { staffGate } from "@/lib/dashboard-api";
import { posterFonts } from "@/lib/poster/fonts";
import {
  isPosterSampleId,
  POSTER_SAMPLES,
  type PosterSampleId,
} from "@/lib/poster/samples";
import { FEED_SIZE, STORY_SIZE } from "@/lib/poster/theme";

/**
 * Anteprima delle locandine, per lavorarci sopra.
 *
 * Serve a guardare il disegno prima che esistano il compositore e Instagram:
 * senza `?sample` restituisce l'elenco, con `?sample=` la locandina. È il
 * gemello dell'anteprima delle comunicazioni, che rende l'HTML della mail
 * dentro un iframe della dashboard — stessa idea, stessa guardia.
 *
 * Non è la route che Meta scaricherà: quella nasce nella fase successiva, è
 * pubblica e legge da Convex. Questa è protetta da `staffGate()` e non tocca
 * nessun dato — legge soltanto le finte di `lib/poster/samples.ts`.
 */
export const dynamic = "force-dynamic";

/**
 * Da dove può arrivare uno sfondo di prova.
 *
 * Il parametro `bg` finisce dritto in un `url()` che satori scarica dal server,
 * quindi lasciarlo libero vorrebbe dire offrire a chiunque passi la guardia un
 * modo di far chiamare indirizzi arbitrari alla nostra macchina. Le fotografie
 * vere stanno tutte sul CDN di Sanity: fuori di lì non serve poter andare.
 */
const ALLOWED_BACKGROUND_HOST = "cdn.sanity.io";

function backgroundFrom(raw: string | null): string | undefined {
  if (!raw) return undefined;

  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return undefined;
    if (url.hostname !== ALLOWED_BACKGROUND_HOST) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}

function gallery(): NextResponse {
  const rows = Object.entries(POSTER_SAMPLES)
    .map(
      ([id, sample]) =>
        `<li><a href="?sample=${id}">${sample.label}</a> <code>${sample.format}</code></li>`,
    )
    .join("");

  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Anteprima locandine</title>
     <style>
       body{font:15px/1.6 system-ui;margin:40px;max-width:46rem}
       h1{font-size:1.4rem;margin:0 0 .25rem}
       p{color:#737373;margin:0 0 1.5rem}
       li{margin:.35rem 0} code{color:#737373;font-size:.8em}
     </style>
     <h1>Anteprima locandine</h1>
     <p>Aggiungi <code>&amp;bg=…</code> con un indirizzo del CDN di Sanity per provare lo sfondo fotografico.</p>
     <ul>${rows}</ul>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const params = new URL(request.url).searchParams;
  const requested = params.get("sample");

  if (!requested) return gallery();

  if (!isPosterSampleId(requested)) {
    return NextResponse.json(
      { error: `Non conosco la locandina «${requested}».` },
      { status: 404 },
    );
  }

  const sample = POSTER_SAMPLES[requested as PosterSampleId];
  const backgroundUrl = backgroundFrom(params.get("bg"));
  const size = sample.format === "story" ? STORY_SIZE : FEED_SIZE;

  return new ImageResponse(
    sample.format === "story" ? (
      <StoryPoster spec={sample.spec} backgroundUrl={backgroundUrl} />
    ) : (
      <FeedPoster spec={sample.spec} backgroundUrl={backgroundUrl} />
    ),
    { ...size, fonts: await posterFonts() },
  );
}
