"use client";

import { useEffect } from "react";

/**
 * Quanta parte dello schermo copre la tastiera, in variabili CSS sulla
 * radice del documento: `--keyboard-inset` (lo spazio coperto in basso),
 * `--visual-height` (l'altezza che resta visibile) e, solo mentre si scrive,
 * `--drawer-max-height`. I drawer le usano per appoggiarsi sopra la tastiera
 * e, mentre si scrive, allungarsi fin quasi in cima (components/ui/drawer.tsx).
 *
 * Prende il posto del riposizionamento di Vaul (`repositionInputs`), che
 * sposta il drawer scrivendogli addosso altezza e posizione e indovina se la
 * tastiera è aperta invertendo un interruttore a ogni salto del viewport.
 * Basta un evento perso — il campo che perde il fuoco prima che la tastiera
 * si chiuda, un sistema che annuncia la chiusura in ritardo — e quegli stili
 * restano: il drawer rimane alzato con uno spazio grigio sotto. Sono
 * segnalazioni aperte su Vaul (#514, #538, #615, #650) mai corrette.
 *
 * `repositionInputs` però resta acceso: su iOS è l'unica cosa che accende
 * `usePreventScroll`, che impedisce a Safari di far scorrere tutta la vista
 * quando si tocca un campo. Senza, iOS sposta la pagina, il drawer finisce
 * mezzo sotto la tastiera e il conto qui sotto non torna. Le sue scritture su
 * posizione e altezza le annullano le regole `!important` del drawer
 * (components/ui/drawer.tsx): Vaul tiene ferma la vista, dove sta il drawer
 * lo decide solo questo componente.
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

/** Lo spazio fra il campo attivo e il bordo del drawer, quando lo si porta in vista. */
const REVEAL_MARGIN = 16;

/**
 * Porta il campo in vista scorrendo solo il contenuto del drawer, mai la
 * pagina: `scrollIntoView` sposterebbe anche la vista, e su iOS è proprio
 * quello che fa finire il drawer sotto la tastiera.
 */
function revealInDrawer(field: HTMLElement) {
  let parent = field.parentElement;
  while (parent && !parent.hasAttribute("data-vaul-drawer")) {
    const { overflowY } = getComputedStyle(parent);
    const scrollable =
      (overflowY === "auto" || overflowY === "scroll") &&
      parent.scrollHeight > parent.clientHeight;

    if (scrollable) {
      const box = parent.getBoundingClientRect();
      const target = field.getBoundingClientRect();
      if (target.bottom > box.bottom - REVEAL_MARGIN) {
        parent.scrollTop += target.bottom - box.bottom + REVEAL_MARGIN;
      } else if (target.top < box.top + REVEAL_MARGIN) {
        parent.scrollTop -= box.top + REVEAL_MARGIN - target.top;
      }
      return;
    }
    parent = parent.parentElement;
  }
}

/**
 * Quanto ci mettono i bottoni in fondo al drawer a cambiare posto, e con che
 * curva: la stessa dei drawer di Vaul, che parte svelta e si posa piano.
 */
const MORPH_DURATION = 280;
const MORPH_EASING = "cubic-bezier(0.32, 0.72, 0, 1)";

/** Dove sta un bottone, rispetto all'angolo in basso a sinistra del suo fondo. */
interface Place {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Le animazioni in corso su un fondo, e come rimetterlo com'era. */
interface Morph {
  animations: Animation[];
  restore: () => void;
}

const morphs = new WeakMap<HTMLElement, Morph>();

// Rispetto al fondo del footer, non alla pagina: mentre i bottoni cambiano
// posto la tastiera sposta tutto il drawer, e quel salto non va animato.
function placeIn(element: Element, footer: DOMRect): Place {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left - footer.left,
    y: rect.top - footer.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function samePlace(a: Place, b: Place) {
  return (
    Math.abs(a.x - b.x) < 0.5 &&
    Math.abs(a.y - b.y) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5 &&
    Math.abs(a.height - b.height) < 0.5
  );
}

/** Ferma l'animazione di un fondo, se c'è, e gli toglie gli stili messi qui. */
function settle(footer: HTMLElement) {
  const morph = morphs.get(footer);
  if (!morph) return;
  morphs.delete(footer);
  for (const animation of morph.animations) animation.cancel();
  morph.restore();
}

/**
 * Cambia la disposizione dei bottoni in fondo ai drawer (`update`) e li fa
 * scivolare dal posto di prima a quello nuovo, invece di farli saltare.
 *
 * Si muovono i bottoni veri, non una loro fotografia: per tutta l'animazione
 * restano nitidi e si possono toccare, e se il drawer si sposta o si chiude li
 * porta con sé. Per la durata dell'animazione ognuno è fissato al suo posto
 * nuovo e parte da quello vecchio; la larghezza cambia con lui, così la scritta
 * resta al centro senza deformarsi. Se la tastiera cambia idea a metà, si
 * riparte da dove sono in quel momento.
 */
function morphFooters(update: () => void) {
  const footers = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-vaul-drawer] [data-slot="drawer-footer"]',
    ),
  );
  const still =
    footers.length === 0 ||
    typeof Element.prototype.animate !== "function" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (still) {
    for (const footer of footers) settle(footer);
    update();
    return;
  }

  // Prima: dove si vedono adesso, anche se stanno ancora scivolando.
  const before = footers.map((footer) => {
    const box = footer.getBoundingClientRect();
    const places = new Map<HTMLElement, Place>();
    for (const child of Array.from(footer.children)) {
      if (!(child instanceof HTMLElement)) continue;
      const place = placeIn(child, box);
      if (place.width > 0 && place.height > 0) places.set(child, place);
    }
    return { footer, places };
  });

  for (const footer of footers) settle(footer);
  update();

  // Dopo: il posto nuovo, e da lì all'indietro fino a quello di prima.
  for (const { footer, places } of before) {
    const box = footer.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) continue;

    const moves: { child: HTMLElement; from: Place; to: Place }[] = [];
    for (const [child, from] of places) {
      if (child.parentElement !== footer) continue;
      const to = placeIn(child, box);
      if (to.width === 0 || to.height === 0) continue;
      moves.push({ child, from, to });
    }
    if (moves.every(({ from, to }) => samePlace(from, to))) continue;

    // Ogni bottone resta fermo al posto nuovo mentre l'animazione lo porta
    // lì: senza, toccarne la misura sposterebbe anche gli altri.
    const relative = getComputedStyle(footer).position === "static";
    if (relative) footer.style.position = "relative";
    footer.style.height = `${box.height}px`;
    for (const { child, to } of moves) {
      child.style.position = "absolute";
      child.style.left = `${to.x - footer.clientLeft}px`;
      child.style.top = `${box.height + to.y - footer.clientTop}px`;
      child.style.width = `${to.width}px`;
      child.style.height = `${to.height}px`;
      child.style.margin = "0";
    }

    const animations = moves
      .filter(({ from, to }) => !samePlace(from, to))
      .map(({ child, from, to }) =>
        child.animate(
          [
            {
              transform: `translate(${from.x - to.x}px, ${from.y - to.y}px)`,
              width: `${from.width}px`,
              height: `${from.height}px`,
            },
            {
              transform: "translate(0px, 0px)",
              width: `${to.width}px`,
              height: `${to.height}px`,
            },
          ],
          { duration: MORPH_DURATION, easing: MORPH_EASING },
        ),
      );

    const morph: Morph = {
      animations,
      restore: () => {
        if (relative) footer.style.removeProperty("position");
        footer.style.removeProperty("height");
        for (const { child } of moves) {
          for (const property of [
            "position",
            "left",
            "top",
            "width",
            "height",
            "margin",
          ]) {
            child.style.removeProperty(property);
          }
        }
      },
    };
    morphs.set(footer, morph);

    Promise.all(animations.map((animation) => animation.finished)).then(
      () => {
        if (morphs.get(footer) !== morph) return;
        morphs.delete(footer);
        morph.restore();
      },
      // Fermata da `settle`, che ha già rimesso tutto a posto.
      () => {},
    );
  }
}

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

        // Dove sta il fondo dell'area visibile rispetto a quello della pagina:
        // è lì che il drawer si appoggia, anche se la vista è scorsa.
        const visibleBottom = viewport.offsetTop + viewport.height;
        const covered = Math.max(0, window.innerHeight - visibleBottom);
        const inset = covered >= KEYBOARD_MIN ? Math.round(covered) : 0;

        // La tastiera è aperta se, con un campo attivo, l'area visibile è più
        // corta della pagina (iOS, Chrome: qualunque sia lo scorrimento) o la
        // pagina stessa si è accorciata (alcune PWA Android).
        const shorter = window.innerHeight - viewport.height >= KEYBOARD_MIN;
        const shrunk = fullHeight - window.innerHeight >= KEYBOARD_MIN;
        const open = inset > 0 || (typing && (shorter || shrunk));
        const visible = Math.round(viewport.height);

        const apply = () => {
          root.style.setProperty("--keyboard-inset", `${inset}px`);
          root.style.setProperty("--visual-height", `${visible}px`);
          // Per lo stile del fondo dei drawer mentre si scrive (globals.css).
          root.toggleAttribute("data-keyboard-open", open);

          // Mentre si scrive lo spazio è poco: il drawer sale fin quasi in
          // cima, lasciando solo la barra di stato e un filo di margine. A
          // tastiera chiusa la variabile sparisce e torna il limite di sempre.
          if (open) {
            root.style.setProperty(
              "--drawer-max-height",
              `calc(${visible}px - env(safe-area-inset-top) - 0.5rem)`,
            );
          } else {
            root.style.removeProperty("--drawer-max-height");
          }
        };

        // Quando la tastiera si apre o si chiude i bottoni in fondo cambiano
        // disposizione: scivolano al posto nuovo invece di saltarci.
        if (open !== lastOpen) morphFooters(apply);
        else apply();

        // Appena la tastiera si apre, il campo attivo dentro un drawer resta
        // in vista. Solo all'apertura, e dopo che il drawer ha preso la nuova
        // misura: rifarlo a ogni evento farebbe scattare lo scorrimento mentre
        // si scrive.
        if (
          open &&
          !lastOpen &&
          typing &&
          active.closest("[data-vaul-drawer]")
        ) {
          requestAnimationFrame(() => revealInDrawer(active));
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
      root.removeAttribute("data-keyboard-open");
    };
  }, []);

  return null;
}
