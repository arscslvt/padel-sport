"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId } from "react";

import { Button } from "@/components/ui/button";
import { PRIVACY_LINK } from "@/lib/links";
import { DURATION, EASE } from "@/lib/motion";
import { useConsent } from "@/providers/consent.provider";

/**
 * Richiesta di consenso per le statistiche di utilizzo.
 *
 * Regole a cui il layout obbedisce, non scelte estetiche: «Rifiuta» ha lo
 * stesso peso visivo di «Accetta», non esiste una X che chiuda senza scegliere
 * e nessuno scroll vale come consenso. Finché non si sceglie, l'SDK non parte
 * — il gate vero sta in <AmplitudeAnalytics />, questo è solo l'interfaccia.
 *
 * Il fornitore non si nomina qui: il banner è l'informativa breve e dichiara
 * finalità e natura del trattamento, mentre l'elenco dei terzi vive
 * nell'informativa estesa, a un clic di distanza (/privacy#cookie).
 */
export function CookieBanner() {
  const { needsChoice, grant, deny } = useConsent();
  const pathname = usePathname();
  const titleId = useId();
  const descriptionId = useId();

  /*
   * Lo studio Sanity è un'applicazione a tutto schermo dietro autenticazione,
   * non una pagina di navigazione pubblica: il banner ci finirebbe sopra. Non
   * chiedendo il consenso lì, lì non si misura — che è la risposta coerente.
   */
  if (pathname?.startsWith("/studio")) return null;

  return (
    <AnimatePresence>
      {needsChoice && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: DURATION.fast, ease: EASE }}
          className="fixed inset-x-0 bottom-0 z-50 flex justify-center p-4 sm:p-6"
        >
          <div
            role="dialog"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            className="border-border bg-background w-full max-w-2xl rounded-2xl border p-5 shadow-lg sm:p-6"
          >
            <p id={titleId} className="text-foreground text-sm font-medium">
              Ci aiuti a capire come va il sito?
            </p>
            <p
              id={descriptionId}
              className="text-muted-foreground mt-2 text-sm leading-relaxed"
            >
              Con il tuo consenso raccogliamo statistiche di utilizzo — le
              pagine più viste e una registrazione della navigazione — tramite
              un fornitore esterno: ci serve a capire dove il sito è scomodo. Se
              preferisci di no, il sito funziona esattamente allo stesso modo:
              restano solo gli strumenti tecnici necessari.{" "}
              <Link
                href={`${PRIVACY_LINK}#cookie`}
                className="text-foreground decoration-foreground/30 hover:decoration-foreground underline underline-offset-2 transition-colors"
              >
                Nell'informativa trovi chi è e cosa raccoglie
              </Link>
              .
            </p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
              <Button onClick={grant} className="sm:flex-1">
                Accetta
              </Button>
              <Button onClick={deny} variant="outline" className="sm:flex-1">
                Rifiuta
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Aggancio per tornare sulla scelta: vive nel footer e dentro l'informativa,
 * perché la revoca dev'essere facile quanto il consenso.
 */
export function CookiePreferencesButton({ className }: { className?: string }) {
  const { reopen } = useConsent();

  return (
    <button type="button" onClick={reopen} className={className}>
      Preferenze cookie
    </button>
  );
}
