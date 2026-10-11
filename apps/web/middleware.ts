import { clerkMiddleware } from "@clerk/nextjs/server";

/**
 * Nessuna rotta del sito è protetta qui: il sito è pubblico, e le pagine che
 * vogliono una sessione (l'area personale, l'attivazione dell'account) la
 * chiedono da sé. Il middleware serve perché `auth()` funzioni nelle route.
 * Il gestionale, con le sue protezioni, è un'app a parte (`apps/dashboard`).
 */
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
