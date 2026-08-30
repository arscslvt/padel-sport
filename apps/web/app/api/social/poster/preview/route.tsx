import { api } from "@padel-sport/backend/convex/_generated/api";
import type { Id } from "@padel-sport/backend/convex/_generated/dataModel";
import {
  exampleValuesFor,
  isTemplated,
} from "@padel-sport/backend/convex/modules/social/situations";
import { renderTemplate } from "@padel-sport/backend/convex/modules/social/template";
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
 * Due mestieri, entrambi riservati allo staff:
 *
 * - `?sample=` disegna una delle finte di `lib/poster/samples.ts`, per lavorare
 *   sul disegno senza dipendere da niente;
 * - `?template=` disegna uno **template**, riempito con i valori d'esempio.
 *
 * Il secondo è quello che serve a chi approva. Leggere «{squadraA} batte
 * {squadraB}» non dice se la frase sta nel riquadro: con un nome doppio da
 * trentacinque caratteri il titolo può sfondare, e sulla pagina di revisione
 * non si vedrebbe. Riempirlo con valori realistici è l'unico modo di
 * giudicarlo prima che vada in circolo.
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

async function templateImage(
  gate: Extract<Awaited<ReturnType<typeof staffGate>>, { ok: true }>,
  templateId: string,
  wanted: string | null,
) {
  const template = await gate.convex.query(
    api.modules.social.templates.get.default,
    { secret: gate.secret, templateId: templateId as Id<"socialTemplates"> },
  );

  if (!template || !isTemplated(template.kind)) {
    return NextResponse.json(
      { error: "Template non trovato." },
      { status: 404 },
    );
  }

  const filled = renderTemplate(template, exampleValuesFor(template.kind));

  // Un template può uscire in più formati con lo stesso testo: si disegna quello
  // chiesto, e in mancanza il primo che dichiara. L'anteprima serve a giudicare
  // l'impaginazione, e le due tele la mettono alla prova in modi diversi — un
  // titolo che sta nel post può sfondare nella storia.
  const format =
    wanted && template.formats.includes(wanted as "feed" | "story")
      ? (wanted as "feed" | "story")
      : (template.formats[0] ?? "feed");

  const size = format === "story" ? STORY_SIZE : FEED_SIZE;

  return new ImageResponse(
    format === "story" ? (
      <StoryPoster spec={filled.poster} />
    ) : (
      <FeedPoster spec={filled.poster} />
    ),
    {
      ...size,
      fonts: await posterFonts(),
      // Un template si corregge riscrivendolo, e allora è un'altra riga con un
      // altro identificativo: entro quel minuto la cache non dà fastidio, e
      // toglie il tremolio quando la pagina si ricarica dopo un'approvazione.
      headers: { "Cache-Control": "private, max-age=60" },
    },
  );
}

export async function GET(request: Request) {
  const gate = await staffGate();
  if (!gate.ok) return gate.response;

  const params = new URL(request.url).searchParams;

  const template = params.get("template");
  if (template) {
    return await templateImage(gate, template, params.get("format"));
  }

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
