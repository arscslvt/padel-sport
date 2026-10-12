"use client";

import { useEffect } from "react";

/**
 * Quanta parte dello schermo copre la tastiera, in due variabili CSS sulla
 * radice del documento: `--keyboard-inset` (lo spazio coperto in basso) e
 * `--visual-height` (l'altezza che resta visibile). I drawer le usano per
 * appoggiarsi sopra la tastiera (components/ui/drawer.tsx).
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
    let lastInset = -1;
    const timers = new Set<number>();

    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const visibleBottom = viewport.offsetTop + viewport.height;
        const covered = Math.max(0, window.innerHeight - visibleBottom);
        const inset = covered >= KEYBOARD_MIN ? Math.round(covered) : 0;

        root.style.setProperty("--keyboard-inset", `${inset}px`);
        root.style.setProperty(
          "--visual-height",
          `${Math.round(viewport.height)}px`,
        );

        // Appena la tastiera si apre, il campo attivo dentro un drawer resta
        // in vista nel drawer rimpicciolito. Solo al cambio: rifarlo a ogni
        // evento farebbe scattare lo scorrimento mentre si scrive.
        if (inset !== lastInset && inset > 0) {
          const active = document.activeElement;
          if (isTextField(active) && active.closest("[data-vaul-drawer]")) {
            active.scrollIntoView({ block: "nearest" });
          }
        }
        lastInset = inset;
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
    };
  }, []);

  return null;
}
