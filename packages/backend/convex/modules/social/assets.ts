import { ANONYMOUS_KINDS, type SocialFormat, type SocialPostKind } from "./lib";

/**
 * Le fotografie che lo staff ha caricato, lette da Sanity.
 *
 * Una `fetch` GROQ diretta all'API pubblica invece del client `next-sanity`:
 * quello vive nel sito, questo gira dentro un'azione Convex, e il dataset è
 * pubblico — nessun token da passare, nessun pacchetto da impacchettare. È lo
 * stesso ragionamento scritto in `modules/courtCalendar/client.ts` per non
 * installare `googleapis` per tre chiamate REST.
 *
 * Il modello sceglie **sui metadati, non guardando le foto**. Allegare le
 * immagini raddoppierebbe latenza e costo per una scelta fra una decina di
 * fotografie che lo staff ha già selezionato e descritto una per una — e per
 * le storie automatiche, dove sopra la foto va comunque una velatura scura, la
 * composizione conta poco. Se un domani servisse davvero, si allegano i tre
 * candidati migliori e cambia solo l'array dei contenuti del messaggio.
 */

interface AssetsConfig {
  projectId: string;
  dataset: string;
  apiVersion: string;
}

export interface AssetCandidate {
  id: string;
  /** Il `_ref` da scrivere sulla riga: l'URL lo comporrà il sito. */
  ref: string;
  description: string;
  usage: string[];
  vertical: boolean;
}

/**
 * La configurazione, o `null` se manca.
 *
 * Stesso patto di `calendarConfig()`: il `null` non è un errore. Senza
 * libreria fotografica le locandine usano il fondo generato, e nessun
 * contenuto viene saltato per una fotografia che non c'è.
 */
export function assetsConfig(): AssetsConfig | null {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET;

  if (!projectId || !dataset) return null;

  return {
    projectId,
    dataset,
    apiVersion: process.env.SANITY_API_VERSION ?? "2026-08-10",
  };
}

const QUERY = `*[
  _type == "socialAsset"
  && active == true
  && (count(kinds) == 0 || $kind in kinds || "qualsiasi" in kinds)
  && ($allowFaces || hasFaces != true)
]{
  "id": _id,
  "ref": image.asset._ref,
  description,
  "usage": coalesce(usage, []),
  "aspectRatio": image.asset->metadata.dimensions.aspectRatio
}`;

/**
 * Le fotografie candidate per un contenuto.
 *
 * Il filtro sui volti non è un vezzo: una faccia riconoscibile sotto un
 * «cerchiamo un quarto» rimetterebbe in circolo esattamente ciò che avevamo
 * tolto dal testo. Vale per i contenuti anonimi, e lo decide questa riga, non
 * chi carica le foto.
 */
export async function listCandidates(
  kind: SocialPostKind,
  format: SocialFormat,
): Promise<AssetCandidate[]> {
  const config = assetsConfig();
  if (!config) return [];

  const params = new URLSearchParams({
    query: QUERY,
    $kind: JSON.stringify(kind),
    $allowFaces: JSON.stringify(!ANONYMOUS_KINDS.has(kind)),
  });

  const url = `https://${config.projectId}.apicdn.sanity.io/v${config.apiVersion}/data/query/${config.dataset}?${params}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.warn(`Libreria foto non letta: HTTP ${response.status}.`);
      return [];
    }

    const body = (await response.json()) as {
      result?: {
        id: string;
        ref?: string;
        description?: string;
        usage?: string[];
        aspectRatio?: number;
      }[];
    };

    const candidates = (body.result ?? [])
      .filter((row) => row.ref && row.description)
      .map((row) => ({
        id: row.id,
        ref: row.ref as string,
        description: row.description as string,
        usage: row.usage ?? [],
        vertical: (row.aspectRatio ?? 1) < 1,
      }));

    // Le verticali prima quando la tela è verticale: il ritaglio funziona
    // comunque, ma una panoramica ridotta a 9:16 perde tutto quello che aveva
    // ai lati, cioè di solito il soggetto.
    if (format === "story") {
      candidates.sort((a, b) => Number(b.vertical) - Number(a.vertical));
    }

    return candidates.slice(0, 12);
  } catch (error) {
    console.warn("Libreria foto non raggiungibile:", error);
    return [];
  }
}
