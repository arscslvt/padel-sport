/**
 * Dove vive il gestionale dello staff.
 *
 * Il gestionale è un'app a parte (`apps/dashboard`) su un dominio suo: il sito
 * lo conosce solo per mandarci chi arriva da un vecchio link `/dashboard` e per
 * il collegamento dentro lo Studio. È una `NEXT_PUBLIC_` perché lo Studio gira
 * nel browser, e quindi viene scritta nel bundle **al build**: va impostata
 * prima del deploy, non dopo.
 *
 * In locale il gestionale gira su `localhost:3001` (`bun run dev:dashboard`);
 * in produzione senza la variabile il build si ferma, invece di pubblicare un
 * sito che rimanda lo staff a un indirizzo inventato.
 */
export function dashboardUrl(): string {
  const url = process.env.NEXT_PUBLIC_DASHBOARD_URL;

  if (url) return url.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_DASHBOARD_URL non è impostata: serve al redirect di /dashboard verso il gestionale.",
    );
  }

  return "http://localhost:3001";
}
