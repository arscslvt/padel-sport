import "server-only";

/**
 * I font delle locandine.
 *
 * `ImageResponse` non vede `next/font`: quello riscrive il CSS di una pagina,
 * qui invece servono i byte veri, perché satori disegna le lettere una a una e
 * senza il file non sa che forma abbiano.
 *
 * Si caricano **entrambe** le famiglie, e non solo il serif dei titoli, per una
 * ragione che si scopre solo sbagliando: nel momento in cui si passa un elenco
 * `fonts`, quello diventa l'unico repertorio che satori conosce, e la Geist
 * impacchettata dentro `next/og` smette di esistere. Caricare il solo Instrument
 * Serif non mette il serif nei titoli: lo mette dappertutto.
 *
 * Li prendiamo da Google a runtime invece di tenerne copia nel repo. Il costo è
 * una chiamata di rete al primo render di ogni istanza, che la cache immutable
 * della route rende rarissima; il guadagno è non avere due binari versionati
 * che fra un anno nessuno saprà più perché stanno lì. Se un domani desse
 * fastidio, si vendorizzano i `.ttf` e cambia solo questo file.
 */

/**
 * Un browser vecchio, a cui Google serve WOFF invece di WOFF2.
 *
 * Non è un travestimento gratuito: satori legge TTF, OTF e WOFF, ma non WOFF2,
 * che è esattamente ciò che l'API restituisce a chi dichiara un browser
 * moderno.
 */
const LEGACY_UA =
  "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.85 Safari/537.36";

/**
 * La forma che `ImageResponse` si aspetta.
 *
 * Dichiarata qui invece di importata: Next non la riesporta da `next/og`, e
 * pescarla dal percorso compilato interno significa legare il file a un
 * dettaglio che il prossimo aggiornamento può spostare senza preavviso.
 */
type PosterFont = {
  name: string;
  data: ArrayBuffer;
  weight?: 400;
  style?: "normal";
};

/**
 * L'indirizzo del sottoinsieme che contiene le lettere che ci servono.
 *
 * Google spezza ogni famiglia in più `@font-face`, uno per alfabeto, ed elenca
 * *latin-ext* prima di *latin*. Prendere il primo `url()` che si incontra — la
 * cosa ovvia da fare — porta a casa un file con le legature del vietnamita e
 * nemmeno una lettera dell'alfabeto italiano: satori non protesta, ripiega in
 * silenzio, e il titolo esce nel carattere sbagliato senza che nulla vada
 * storto.
 *
 * Si sceglie quindi per `unicode-range` e non per posizione: `U+0000-00FF` è il
 * latino di base, accenti italiani compresi.
 */
function latinSubset(css: string): string | null {
  for (const block of css.split("@font-face")) {
    if (!block.includes("U+0000-00FF")) continue;
    const url = /src:\s*url\((https:\/\/[^)]+)\)/.exec(block);
    if (url) return url[1];
  }

  return null;
}

async function load(family: string): Promise<PosterFont | null> {
  const query = family.replaceAll(" ", "+");

  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${query}:wght@400&display=swap`,
      { headers: { "User-Agent": LEGACY_UA } },
    );

    if (!css.ok) {
      console.warn(`${family} non scaricata: HTTP ${css.status}.`);
      return null;
    }

    const url = latinSubset(await css.text());

    if (!url) {
      console.warn(`${family}: nessun sottoinsieme latino nel CSS di Google.`);
      return null;
    }

    const file = await fetch(url);

    if (!file.ok) {
      console.warn(`${family} non scaricata: HTTP ${file.status}.`);
      return null;
    }

    return {
      name: family,
      data: await file.arrayBuffer(),
      weight: 400,
      style: "normal",
    };
  } catch (error) {
    console.warn(`${family} non disponibile:`, error);
    return null;
  }
}

/**
 * Una sola richiesta per istanza, anche se due render partono insieme: si
 * memorizza la promessa, non il risultato.
 */
let cached: Promise<PosterFont[]> | null = null;

async function loadAll(): Promise<PosterFont[]> {
  const [sans, display] = await Promise.all([
    load("Geist"),
    load("Instrument Serif"),
  ]);

  // Senza la Geist non si registra niente: meglio la sostituta di satori su
  // tutta la locandina che il serif dei titoli spalmato anche sul corpo. È il
  // caso in cui una resa uniformemente diversa batte una resa a metà.
  if (!sans) {
    console.warn("Nessun font caricato: la locandina userà quello di serie.");
    return [];
  }

  return display ? [sans, display] : [sans];
}

/**
 * I font da passare a `ImageResponse`.
 *
 * Un elenco vuoto è una risposta valida: vuol dire «usa quello che hai». Non si
 * fallisce mai per un font — una locandina con il titolo nel carattere
 * sbagliato è un dispiacere, una storia non pubblicata perché
 * fonts.googleapis.com aveva il singhiozzo è un guasto.
 */
export function posterFonts(): Promise<PosterFont[]> {
  cached ??= loadAll();
  return cached;
}
