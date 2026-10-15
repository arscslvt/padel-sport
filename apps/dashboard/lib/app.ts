/**
 * Il nome del gestionale come app installata: sotto l'icona, nel manifest,
 * nel titolo della web app su iPhone.
 *
 * Si cambia qui. L'unica copia fuori da qui è in `public/sw.js`, che è un file
 * statico e non può importare niente: va allineata a mano.
 */
export const APP_NAME = "Padel Sport Manager";

/**
 * La versione delle icone dell'app: va alzata a ogni icona nuova.
 *
 * iPhone e iPad tengono l'icona della schermata Home in una cache legata
 * all'indirizzo, e la conservano anche se l'app si toglie e si rimette: con
 * lo stesso indirizzo l'installazione mostra l'icona nuova nell'anteprima e
 * poi la sostituisce con quella vecchia. Cambiando l'indirizzo non c'è niente
 * da riusare.
 */
const ICON_VERSION = 2;

/** Un'icona di `public/icons`, con la versione nell'indirizzo. */
export const appIcon = (file: string) => `/icons/${file}?v=${ICON_VERSION}`;
