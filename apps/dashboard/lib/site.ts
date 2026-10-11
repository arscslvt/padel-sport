/**
 * Il sito pubblico, visto dal gestionale.
 *
 * Il gestionale vive su un dominio suo: i link che portano al sito — la home,
 * lo Studio, il regolamento dei punti — non possono più essere percorsi
 * relativi, che qui aprirebbero una pagina del gestionale che non esiste.
 * In locale il sito gira su un'altra porta, da qui la variabile; il valore di
 * riserva è il dominio di produzione.
 */
export const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://asdpadelsport.com"
).replace(/\/$/, "");

/** Un percorso del sito pubblico, come indirizzo assoluto. */
export const siteUrl = (path: string) => `${PUBLIC_SITE_URL}${path}`;
