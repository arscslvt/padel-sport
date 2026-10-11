/**
 * Gli indirizzi dell'accesso al gestionale.
 *
 * Il login è una pagina nostra: li leggono il `ClerkProvider` (layout), il
 * proxy, che ci manda chi non ha una sessione, e le pagine dell'accesso.
 */
export const SIGN_IN_PATH = "/sign-in";

/**
 * La pagina a cui portare chi ha appena fatto l'accesso, ripulita.
 *
 * Arriva da fuori — `?redirect_url=` lo scrive Clerk, ma chiunque può
 * scriverlo in un link — quindi vale solo se resta su questo dominio: un
 * accesso riuscito non deve diventare un rimbalzo verso un sito qualunque.
 * Un ritorno al login stesso non ha senso e diventa la home.
 */
export function safeRedirectPath(
  value: string | string[] | null | undefined,
  origin: string,
): string {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return "/";

  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return "/";
    if (url.pathname.startsWith(SIGN_IN_PATH)) return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
