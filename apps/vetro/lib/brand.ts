/**
 * Il marchio in un posto solo.
 *
 * Vetro è un prodotto a sé, staccato dal club in cui è nato: niente nome del
 * club, niente logo del club. Il nome viene dalle pareti del campo da padel,
 * e dice anche cosa fa il gestionale, mostrare il club in chiaro. Per
 * cambiarlo basta questo file.
 */
export const BRAND = {
  name: "Vetro",
  tagline: "Il gestionale per club di padel",
  description:
    "Vetro è il gestionale per club di padel. Prenotazioni, clienti, pagamenti e comunicazioni in un posto solo.",
  url: "https://vetro.club",
} as const;

/** Le ancore della pagina, condivise fra navigazione e sezioni. */
export const ANCHORS = {
  how: "come-funziona",
  features: "funzioni",
  benefits: "vantaggi",
  sumup: "sumup",
  players: "giocatori",
  faq: "domande",
  pricing: "prezzi",
  demo: "demo",
} as const;

/**
 * Il link a una sezione della home. Con la barra davanti funziona da ogni
 * pagina: dalla home scorre e basta, da /pricing torna alla home e scorre.
 */
export const anchor = (id: (typeof ANCHORS)[keyof typeof ANCHORS]) => `/#${id}`;

/** Le pagine, in inglese come ogni percorso del monorepo. */
export const ROUTES = {
  home: "/",
  pricing: "/pricing",
} as const;
