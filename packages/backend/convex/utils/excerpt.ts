/**
 * Il testo libero scritto da un cliente, accorciato per stare in un avviso
 * allo staff. Un modulo solo per Convex e per il sito, senza niente di
 * specifico a un runtime.
 */

/** Oltre questa soglia il testo libero smette di essere leggibile in notifica. */
const MAX_EXCERPT = 300;

/** Taglia il testo libero sull'ultimo spazio utile, senza mozzare le parole. */
export function excerpt(text: string, max = MAX_EXCERPT) {
  if (text.length <= max) return text;

  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");

  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}
