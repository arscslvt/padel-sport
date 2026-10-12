"use client";

import { useEffect } from "react";

/**
 * Quanta parte dello schermo copre la tastiera, in variabili CSS sulla
 * radice del documento: `--keyboard-inset` (lo spazio coperto in basso),
 * `--visual-height` (l'altezza che resta visibile) e, solo mentre si scrive,
 * `--drawer-max-height`. I drawer le usano per appoggiarsi sopra la tastiera
 * e, mentre si scrive, allungarsi fin quasi in cima (components/ui/drawer.tsx).
 *
 * Prende il posto di `repositionInputs` di Vaul, che sposta il drawer
 * scrivendogli addosso altezza e posizione e indovina se la tastiera è
 * aperta invertendo un interruttore a ogni salto del viewport. Basta un
 * evento perso — il campo che perde il fuoco prima che la tastiera si
 * chiuda, un sistema che annuncia la chiusura in ritardo — e quegli stili
 * restano: il drawer rimane alzato con uno spazio grigio sotto. Sono
 * segnalazioni aperte su Vaul (#514, #538, #615, #650) mai corrette.
 *
 * Qui non c'è stato da perdere: ogni volta si rimisura da capo quel che si
 * vede, e a tastiera chiusa il conto torna zero da solo. La misura è lo
 * spazio fra il fondo dell'area visibile (`visualViewport`) e il fondo della
 * pagina (`innerHeight`), e vale in tutti e due i modi in cui i sistemi
 * gestiscono la tastiera: iOS e Chrome restringono solo l'area visibile, e lo
 * spazio coperto è la tastiera; alcune PWA Android restringono tutta la
 * pagina, lo spazio è zero e il drawer, fissato in basso, è già sopra.
 */

/** Sotto questa soglia la differenza è una barra del browser, non una tastiera. */
const KEYBOARD_MIN = 80;

const TEXT_INPUT_TYPES = new Set([
  "text",
  "search",
  "email",
  "tel",
  "url",
  "number",
  "password",
  "date",
  "time",
]);

function isTextField(element: Element | null): element is HTMLElement {
  if (element instanceof HTMLTextAreaElement) return true;
  if (element instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(element.type);
  }
  return element instanceof HTMLElement && element.isContentEditable;
}

export function KeyboardInset() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const root = document.documentElement;
    let frame = 0;
    let lastOpen = false;
    const timers = new Set<number>();

    // L'altezza piena della pagina, per riconoscere la tastiera anche dove
    // restringe tutta la pagina invece della sola area visibile (alcune PWA
    // Android): lì lo spazio coperto in basso è zero, ma la pagina si accorcia.
    // Si riparte a ogni cambio di larghezza, cioè di orientamento.
    let fullHeight = window.innerHeight;
    let fullWidth = window.innerWidth;

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.innerWidth !== fullWidth) {
          fullWidth = window.innerWidth;
          fullHeight = window.innerHeight;
        }

        const active = document.activeElement;
        const typing = isTextField(active);
        // Senza un campo attivo la pagina più bassa è una barra del browser,
        // non una tastiera: l'altezza piena si aggiorna solo allora.
        if (!typing) fullHeight = Math.max(fullHeight, window.innerHeight);

        const visibleBottom = viewport.offsetTop + viewport.height;
        const covered = Math.max(0, window.innerHeight - visibleBottom);
        const inset = covered >= KEYBOARD_MIN ? Math.round(covered) : 0;
        const shrunk = fullHeight - window.innerHeight >= KEYBOARD_MIN;
        const open = inset > 0 || (typing && shrunk);
        const visible = Math.round(viewport.height);

        root.style.setProperty("--keyboard-inset", `${inset}px`);
        root.style.setProperty("--visual-height", `${visible}px`);

        // Mentre si scrive lo spazio è poco: il drawer sale fin quasi in cima,
        // lasciando solo la barra di stato e un filo di margine. A tastiera
        // chiusa la variabile sparisce e torna il limite di sempre.
        if (open) {
          root.style.setProperty(
            "--drawer-max-height",
            `calc(${visible}px - env(safe-area-inset-top) - 0.5rem)`,
          );
        } else {
          root.style.removeProperty("--drawer-max-height");
        }

        // Appena la tastiera si apre, il campo attivo dentro un drawer resta
        // in vista. Solo all'apertura: rifarlo a ogni evento farebbe scattare
        // lo scorrimento mentre si scrive.
        if (
          open &&
          !lastOpen &&
          typing &&
          active.closest("[data-vaul-drawer]")
        ) {
          active.scrollIntoView({ block: "nearest" });
        }
        lastOpen = open;
      });
    };

    // Alcuni sistemi annunciano la chiusura della tastiera in ritardo, o non
    // la annunciano affatto: quando il fuoco cambia si rimisura anche dopo,
    // quando l'animazione della tastiera è finita.
    const measureSoon = () => {
      measure();
      for (const delay of [150, 450]) {
        const timer = window.setTimeout(() => {
          timers.delete(timer);
          measure();
        }, delay);
        timers.add(timer);
      }
    };

    measure();
    viewport.addEventListener("resize", measure);
    viewport.addEventListener("scroll", measure);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measureSoon);
    document.addEventListener("focusin", measureSoon);
    document.addEventListener("focusout", measureSoon);

    return () => {
      cancelAnimationFrame(frame);
      for (const timer of timers) window.clearTimeout(timer);
      viewport.removeEventListener("resize", measure);
      viewport.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measureSoon);
      document.removeEventListener("focusin", measureSoon);
      document.removeEventListener("focusout", measureSoon);
      root.style.removeProperty("--keyboard-inset");
      root.style.removeProperty("--visual-height");
      root.style.removeProperty("--drawer-max-height");
    };
  }, []);

  return null;
}
