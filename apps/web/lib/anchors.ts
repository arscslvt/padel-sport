type Anchor = "support" | "contacts" | "findPlayers" | "supportForm";

/**
 * Ancore di pagina: gli id che compaiono negli URL come frammento.
 *
 * Non sono id di componente ma indirizzi pubblici (`/#contatti`), quindi devono
 * restare stabili e leggibili: `useId()` qui romperebbe il collegamento.
 * Tenerli qui serve a due cose: chi punta all'ancora e chi la espone usano la
 * stessa stringa, e l'attributo `id` non è più un letterale — che è ciò che
 * `useUniqueElementIds` segnala.
 */
export const ANCHORS: {
  [K in Anchor]: string;
} = {
  support: "support",
  contacts: "contacts",
  findPlayers: "find-players",
  supportForm: "support-form",
} as const;

/**
 * Frammento pronto per un `href`.
 *
 * Va su un `<a>` nativo, non su `next/link`: il router tratta come no-op una
 * navigazione verso l'URL già corrente, quindi al secondo clic — con l'hash
 * ormai in barra indirizzi — non scorrerebbe più nulla. Il browser invece
 * riporta sempre al frammento, e lo fa in modo morbido perché
 * `scroll-behavior: smooth` sta su `html` in globals.css.
 *
 * Le sezioni bersaglio non portano `scroll-mt-*`: il loro bordo superiore deve
 * combaciare con quello della finestra. La pillola dell'header ci galleggia
 * sopra senza coprire nulla, perché atterra sul padding alto della sezione.
 */
export function anchorHref(anchor: (typeof ANCHORS)[keyof typeof ANCHORS]) {
  return `#${anchor}` as const;
}

/**
 * Bersagli di `getElementById` nella pagina del torneo: la CTA flottante li
 * misura per decidere quando staccarsi. Non sono ancore di URL, ma valgono le
 * stesse ragioni — devono essere stabili e condivisi fra chi li espone e chi li
 * cerca.
 */
export const TOURNAMENT_ANCHORS = {
  shell: "tournament-page-shell",
  ctaSource: "tournament-cta-source",
} as const;
