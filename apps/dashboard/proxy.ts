import { clerkMiddleware } from "@clerk/nextjs/server";

import { SIGN_IN_PATH } from "@/lib/auth-routes";

/** Le sole pagine che si aprono senza sessione: quelle per ottenerla. */
const isPublicPath = (pathname: string) =>
  pathname === SIGN_IN_PATH || pathname.startsWith(`${SIGN_IN_PATH}/`);

/**
 * Tutto il gestionale vuole una sessione: senza, si finisce al login.
 *
 * Il login è la nostra pagina (`signInUrl`), non quella ospitata da Clerk:
 * `auth.protect()` ci manda lì con `?redirect_url=` per tornare dove si era.
 *
 * Le route `/api` restano fuori di proposito. `auth.protect()` lì risponderebbe
 * con un 404 muto; ci pensa `staffGate` (lib/dashboard-api.ts), che distingue
 * chi non ha fatto l'accesso (401) da chi non è dello staff (403) e lo scrive
 * nella risposta. L'appartenenza allo staff, per le pagine, la controlla
 * `requireStaffMember` pagina per pagina.
 */
export default clerkMiddleware(
  async (auth, req) => {
    const { pathname } = req.nextUrl;
    if (pathname.startsWith("/api") || isPublicPath(pathname)) return;
    await auth.protect();
  },
  { signInUrl: SIGN_IN_PATH },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
