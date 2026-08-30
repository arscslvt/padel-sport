import type { PosterSpec } from "./lib";
import type { TemplateValues } from "./situations";

/**
 * Come un template diventa un contenuto.
 *
 * Sostituzione di testo e nient'altro: nessuna condizione, nessun ciclo,
 * nessuna espressione da valutare. La scelta di quale template usare è già
 * avvenuta altrove — in `situationOf`, che è codice — e qui resta solo il
 * lavoro meccanico. È deliberato: il momento in cui un motore di template diventa
 * un linguaggio di programmazione è il momento in cui smette di essere
 * leggibile.
 *
 * Due tipi di buco, e sono tutti:
 *
 *   {nome}    un valore singolo, dentro qualunque testo
 *   {*nome}   una lista, e solo da sola come voce puntata: si espande in tante
 *             voci quanti sono gli elementi
 *
 * La lista esiste perché i set di una partita e le fasce libere di una giornata
 * sono di lunghezza variabile, e una voce puntata per elemento è esattamente
 * come si leggono.
 */

const SCALAR = /\{([a-zA-Z]+)\}/g;
const LIST = /^\{\*([a-zA-Z]+)\}$/;

/** Un template: gli stessi campi di un contenuto, ma con i buchi. */
export interface SocialTemplate {
  caption: string;
  hashtags: string[];
  poster: PosterSpec;
}

function fill(text: string, values: Record<string, string>): string {
  return text.replace(SCALAR, (whole, name: string) => values[name] ?? whole);
}

/**
 * Riempie un template.
 *
 * Un buco senza valore resta scritto com'è, invece di sparire: un `{squadraB}`
 * visibile nel testo è brutto ma si nota subito, una frase mutilata in silenzio
 * no. Comunque non dovrebbe succedere — `validateTemplate` lo impedisce a
 * monte, all'approvazione.
 */
export function renderTemplate(
  template: SocialTemplate,
  { values, lists }: TemplateValues,
): SocialTemplate {
  const bullets = template.poster.bullets?.flatMap((bullet) => {
    const list = LIST.exec(bullet.trim());
    if (!list) return [fill(bullet, values)];
    return lists[list[1]] ?? [];
  });

  return {
    caption: fill(template.caption, values),
    hashtags: template.hashtags,
    poster: {
      ...template.poster,
      eyebrow: fill(template.poster.eyebrow, values),
      headline: fill(template.poster.headline, values),
      subhead: template.poster.subhead
        ? fill(template.poster.subhead, values)
        : undefined,
      bullets: bullets?.length ? bullets : undefined,
      footer: template.poster.footer
        ? fill(template.poster.footer, values)
        : undefined,
    },
  };
}

/** Tutti i buchi che un template si aspetta. */
export function placeholdersIn(template: SocialTemplate): {
  values: string[];
  lists: string[];
} {
  const values = new Set<string>();
  const lists = new Set<string>();

  const scan = (text: string | undefined) => {
    if (!text) return;
    for (const match of text.matchAll(SCALAR)) values.add(match[1]);
  };

  scan(template.caption);
  scan(template.poster.eyebrow);
  scan(template.poster.headline);
  scan(template.poster.subhead);
  scan(template.poster.footer);

  for (const bullet of template.poster.bullets ?? []) {
    const list = LIST.exec(bullet.trim());
    if (list) lists.add(list[1]);
    else scan(bullet);
  }

  return { values: [...values], lists: [...lists] };
}

/**
 * Un template chiede solo buchi che esistono?
 *
 * Va controllato quando il template viene approvato, non quando viene usato. Il
 * momento in cui si scopre che un modello si è inventato `{squadraC}` deve
 * essere davanti a chi sta approvando, non tre settimane dopo davanti a una
 * finale che non esce.
 */
export function validateTemplate(
  template: SocialTemplate,
  available: TemplateValues,
): string[] {
  const used = placeholdersIn(template);

  const unknown = [
    ...used.values
      .filter((name) => !(name in available.values))
      .map((name) => `{${name}}`),
    ...used.lists
      .filter((name) => !(name in available.lists))
      .map((name) => `{*${name}}`),
  ];

  return unknown;
}

/**
 * Il template contiene valori d'esempio scritti a mano invece dei buchi?
 *
 * È l'errore che il modello fa più volentieri: gli si mostra «Rossi / Bianchi»
 * per spiegargli cos'è `{squadraA}`, e lui scrive «Rossi / Bianchi». Un template
 * così non fallisce — funziona benissimo — e pubblica per sempre i nomi di due
 * giocatori che non esistono.
 *
 * `validateTemplate` non lo intercetta: quello controlla i buchi che ci sono,
 * questo controlla quelli che dovrebbero esserci e non ci sono.
 */
export function literalsIn(
  template: SocialTemplate,
  examples: TemplateValues,
): string[] {
  const haystack = [
    template.caption,
    template.poster.eyebrow,
    template.poster.headline,
    template.poster.subhead ?? "",
    ...(template.poster.bullets ?? []),
    template.poster.footer ?? "",
  ]
    .join("\n")
    .toLowerCase();

  const candidates = [
    ...Object.values(examples.values),
    ...Object.values(examples.lists).flat(),
  ];

  return candidates.filter(
    // Sotto i quattro caratteri sono numeri e sigle che possono comparire per
    // caso: «2», «6-4». Sopra, è una citazione.
    (value) => value.length >= 4 && haystack.includes(value.toLowerCase()),
  );
}
