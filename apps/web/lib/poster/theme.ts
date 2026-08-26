import { color } from "@/emails/theme";

/**
 * Misure e trattamenti delle locandine social.
 *
 * I colori non stanno qui: arrivano da `emails/theme.ts`, che porta scritto in
 * cima di essere l'unico posto in cui i token del brand vivono in hex. Il
 * vincolo che li ha messi lì — il mezzo non conosce `oklch` né le variabili
 * CSS — vale identico per satori, quindi ricopiarli qui vorrebbe dire creare
 * la seconda copia che quel commento cerca di evitare.
 *
 * Le misure invece sono proprie: la posta ragiona su una colonna di 496px, una
 * storia su una tela di 1080×1920. Nessuno dei due numeri serve all'altra.
 */

/** Formato del feed: 4:5, il più alto che Instagram accetta senza ritagliare. */
export const FEED_SIZE = { width: 1080, height: 1350 } as const;

/** Formato delle storie: 9:16 pieno. */
export const STORY_SIZE = { width: 1080, height: 1920 } as const;

/**
 * Margine di sicurezza in alto e in basso nelle storie.
 *
 * Instagram sovrappone il proprio cromo — nome del profilo sopra, barra della
 * risposta sotto — e sono circa 250px per lato su una tela di 1920. Il testo
 * che finisce lì non è tagliato, è coperto: peggio, perché in anteprima si
 * vede benissimo.
 */
export const STORY_SAFE_TOP = 260;
export const STORY_SAFE_BOTTOM = 300;

/**
 * I tre trattamenti, come coppie di colori già risolte.
 *
 * `photo` non ha un fondo proprio: sopra la fotografia ci va una velatura, e i
 * colori del testo sono quelli di `ink` perché la velatura è scura per
 * definizione — una chiara non reggerebbe il testo su una foto di campo in
 * pieno sole.
 */
export const treatment = {
  ink: {
    background: color.ink,
    foreground: color.inkForeground,
    muted: "#a3a3a3",
    rule: "#2e2e2e",
  },
  light: {
    background: color.background,
    foreground: color.foreground,
    muted: color.mutedForeground,
    rule: color.border,
  },
  photo: {
    background: color.ink,
    foreground: color.inkForeground,
    muted: "#d4d4d4",
    rule: "rgba(250,250,250,0.28)",
  },
} as const;

/**
 * Scala tipografica per formato.
 *
 * Due scale e non una perché la storia ha 570px di altezza in più ma la stessa
 * larghezza: il titolo può respirare in verticale senza che la riga si accorci.
 */
export const scale = {
  feed: {
    padding: 80,
    eyebrow: 26,
    headline: 88,
    subhead: 36,
    bullet: 34,
    footer: 28,
  },
  story: {
    padding: 88,
    eyebrow: 28,
    headline: 104,
    subhead: 40,
    bullet: 36,
    footer: 30,
  },
} as const;

/**
 * Velatura sopra la fotografia.
 *
 * Un gradiente e non un velo uniforme: la foto deve restare leggibile in alto,
 * dove non c'è testo, e sparire sotto, dove il titolo deve staccare. I valori
 * sono stati scelti sul caso peggiore, una foto di campo azzurro sovraesposta.
 */
export const PHOTO_SCRIM =
  "linear-gradient(180deg, rgba(13,13,13,0.15) 0%, rgba(13,13,13,0.55) 45%, rgba(13,13,13,0.92) 100%)";

/**
 * Fondo per quando una fotografia non c'è.
 *
 * Non è un ripiego provvisorio: la libreria può essere vuota, Sanity può non
 * rispondere, e nessuna di queste è una buona ragione per non pubblicare. Resta
 * dentro la scala di grigi del brand.
 */
export const GENERATED_BACKGROUND =
  "linear-gradient(155deg, #1c1c1c 0%, #0d0d0d 55%, #000000 100%)";

/** Font display del brand, con lo stack di riserva se il webfont non arriva. */
export const DISPLAY_FAMILY = "Instrument Serif, Geist, serif";

/** Corpo del testo: Geist è già impacchettata dentro `next/og`. */
export const SANS_FAMILY = "Geist, sans-serif";
