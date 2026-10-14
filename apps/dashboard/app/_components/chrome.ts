/**
 * I colori delle barre del browser nella dashboard: gli stessi dello sfondo
 * (`--background`, globals.css) nei due temi, così sopra e sotto la pagina
 * non resta una banda di colore diverso.
 *
 * Sta in un modulo senza "use client" perché lo leggono in due: il `viewport`
 * del layout, che è un componente server, e il provider del tema nel browser.
 * Da un modulo client il layout riceverebbe un riferimento, non la stringa.
 */
export const DASHBOARD_CHROME_COLOR = {
  light: "#fafafa",
  dark: "#0a0a0a",
} as const;
