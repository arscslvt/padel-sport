/**
 * Ancore di pagina: gli id che compaiono negli URL come frammento.
 *
 * Non sono id di componente ma indirizzi pubblici (`/#contatti`), quindi devono
 * restare stabili e leggibili: `useId()` qui romperebbe il collegamento.
 * Tenerli qui serve a due cose: chi punta all'ancora e chi la espone usano la
 * stessa stringa, e l'attributo `id` non è più un letterale — che è ciò che
 * `useUniqueElementIds` segnala.
 */
export const ANCHORS = {
  support: "supporto",
  contacts: "contatti",
  findPlayers: "trova-giocatori",
  supportForm: "modulo-supporto",
} as const;

/** Frammento pronto per un `href`. */
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
