/**
 * Costanti di movimento condivise.
 * Tenerle in un solo posto evita che ogni sezione inventi la propria curva:
 * il ritmo del sito resta riconoscibile anche quando le animazioni sono minime.
 */

/** Ease-out morbida, quasi senza rimbalzo: entra decisa e si posa. */
export const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.35,
  base: 0.55,
  slow: 0.8,
} as const;

/** Viewport per i reveal legati allo scroll: una volta sola, a un quarto di elemento visibile. */
export const VIEWPORT = {
  once: true,
  amount: 0.25,
  margin: "0px 0px -10% 0px",
} as const;
