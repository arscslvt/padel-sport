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

/**
 * La curva dei cambi di stato del gestionale: la stessa di `--ease-out` in
 * globals.css, scritta per Motion. Più decisa di `EASE`, che accompagna i
 * reveal delle pagine: qui l'interfaccia deve rispondere, non presentarsi.
 */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Durate dei cambi di stato: sotto i 300ms, l'uscita più svelta dell'entrata. */
export const UI_DURATION = {
  enter: 0.22,
  exit: 0.15,
} as const;

/** Viewport per i reveal legati allo scroll: una volta sola, a un quarto di elemento visibile. */
export const VIEWPORT = {
  once: true,
  amount: 0.25,
  margin: "0px 0px -10% 0px",
} as const;
