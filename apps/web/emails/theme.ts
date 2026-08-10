/**
 * Traduzione del design system del sito in stili per la posta.
 *
 * I client di posta non supportano `oklch` né le variabili CSS: questi valori
 * sono la conversione in hex dei token di `globals.css`. Quando cambiano i
 * colori del brand, vanno riconvertiti qui — è l'unico punto in cui vivono.
 *
 * Instrument Serif non è caricabile in modo affidabile via posta (Gmail scarta
 * i webfont), quindi i titoli usano uno stack serif di sistema che ne conserva
 * il tono editoriale.
 */

export const color = {
  background: "#ffffff",
  foreground: "#0a0a0a",
  muted: "#f4f4f4",
  mutedForeground: "#737373",
  border: "#ebebeb",
  ink: "#0d0d0d",
  inkForeground: "#fafafa",
} as const;

export const font = {
  display: 'Instrument Serif, Georgia, "Times New Roman", serif',
  sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
} as const;

export const radius = {
  card: "20px",
  pill: "999px",
} as const;

export const main = {
  backgroundColor: color.muted,
  fontFamily: font.sans,
  margin: 0,
  padding: "24px 0",
} as const;

export const container = {
  backgroundColor: color.background,
  border: `1px solid ${color.border}`,
  borderRadius: radius.card,
  margin: "0 auto",
  maxWidth: "560px",
  overflow: "hidden",
  width: "100%",
} as const;

export const content = {
  padding: "32px 32px 8px",
} as const;

export const eyebrow = {
  color: color.mutedForeground,
  fontSize: "11px",
  letterSpacing: "0.18em",
  margin: "0 0 12px",
  textTransform: "uppercase",
} as const;

export const heading = {
  color: color.foreground,
  fontFamily: font.display,
  fontSize: "30px",
  fontWeight: 400,
  letterSpacing: "-0.02em",
  lineHeight: "1.15",
  margin: "0 0 12px",
} as const;

export const paragraph = {
  color: color.mutedForeground,
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0 0 16px",
} as const;

export const panel = {
  backgroundColor: color.muted,
  borderRadius: "14px",
  margin: "8px 0 24px",
  padding: "20px 24px",
} as const;

export const detailLabel = {
  color: color.mutedForeground,
  fontSize: "12px",
  margin: 0,
  paddingBottom: "2px",
} as const;

export const detailValue = {
  color: color.foreground,
  fontSize: "15px",
  fontWeight: 500,
  margin: 0,
} as const;

export const button = {
  backgroundColor: color.foreground,
  borderRadius: radius.pill,
  color: color.background,
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 500,
  padding: "12px 24px",
  textDecoration: "none",
} as const;

export const divider = {
  borderColor: color.border,
  borderTopWidth: "1px",
  margin: "24px 0",
} as const;

export const footerText = {
  color: color.mutedForeground,
  fontSize: "12px",
  lineHeight: "1.6",
  margin: "0 0 4px",
} as const;

export const link = {
  color: color.foreground,
  textDecoration: "underline",
} as const;
