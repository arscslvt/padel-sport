/**
 * La fascia sotto la barra di stato, nel gestionale installato su iPhone.
 *
 * Da iOS 26 le web app aggiunte alla schermata Home disegnano la pagina fin
 * sotto l'orologio, e il sistema ci stende sopra una sfumatura sfocata (il
 * «bordo di scorrimento» di Liquid Glass) che arriva a coprire il titolo
 * della pagina. Non c'è un meta tag né una proprietà CSS per spegnerla. Un
 * elemento fisso e opaco attaccato al bordo però fa cambiare idea a WebKit:
 * prende il suo colore per quella zona invece di sfocare il contenuto.
 *
 * È alta esattamente quanto la zona non sicura in cima, e solo nell'app
 * installata: nella scheda del browser la pagina non arriva lassù, e
 * l'altezza sarebbe comunque zero. Sta fuori dal tour, che rimpicciolisce il
 * suo contenitore e trascinerebbe con sé un elemento fisso.
 */
export function StatusBarScrim() {
  return (
    <div
      aria-hidden
      className="bg-background pointer-events-none fixed inset-x-0 top-0 z-40 hidden h-[env(safe-area-inset-top)] [@media(display-mode:standalone)]:block"
    />
  );
}
