/**
 * Il movimento del sito, in un posto solo.
 *
 * Tre curve e basta. Le curve di sistema del CSS sono troppo morbide: queste
 * partono decise, così l'occhio vede subito il movimento e la pagina sembra
 * rispondere. Niente ease-in per ciò che entra, mai.
 */

/** Per ciò che entra o risponde a un gesto. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** Per ciò che si sposta o cambia forma restando sullo schermo. */
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

/** La curva dei pannelli di iOS: per ciò che scorre in posizione. */
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

export const DURATION = {
  /** Pressione di un tasto, cambio di un'etichetta. */
  press: 0.16,
  /** Popover, badge, piccoli cambi di stato. */
  ui: 0.24,
  /** Le scene dei componenti di prodotto. */
  scene: 0.45,
  /** Reveal di sezione: è marketing, può prendersi il suo tempo. */
  reveal: 0.8,
} as const;

/** Scaglionamento fra elementi fratelli: abbastanza da leggere la sequenza. */
export const STAGGER = 0.06;

/**
 * Il blur che accompagna entrate e cambi di stato. Unisce lo stato vecchio e
 * quello nuovo in un'unica trasformazione, invece di due oggetti che si
 * sovrappongono. Resta sotto i 10px: oltre costa, soprattutto su Safari.
 */
export const BLUR = {
  soft: "blur(4px)",
  reveal: "blur(10px)",
  none: "blur(0px)",
} as const;

/** Reveal legati allo scroll: una volta sola, con un po' di elemento in vista. */
export const VIEWPORT = {
  once: true,
  amount: 0.3,
  margin: "0px 0px -8% 0px",
} as const;
