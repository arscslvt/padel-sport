"use client";

import {
  animate,
  type MotionValue,
  motion,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  Fragment,
  type Ref,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Effetto macchina da scrivere con cursore che scorre.
 *
 * Il testo è tutto nel DOM fin dall'inizio, solo trasparente: il layout — e
 * quindi il punto in cui la frase va a capo — è già quello definitivo e non
 * balla mentre le lettere entrano.
 *
 * Il cursore non salta di lettera in lettera. Un unico valore continuo (i
 * "caratteri scritti", con la virgola) scorre nel tempo, e la posizione del
 * cursore è l'interpolazione fra le coordinate di due caratteri contigui: il
 * movimento è quindi continuo anche dentro il singolo glifo. Niente molla:
 * inseguirebbe il testo con un ritardo di un paio di lettere, appoggiando il
 * cursore sopra le parole invece che davanti.
 *
 * Il ritorno a capo è l'unico salto vero, e si prende il suo tempo: quel
 * tratto di percorso dura `RETURN_DURATION` invece di un battito, così il
 * cursore ci plana con calma — proprio come il carrello di una Olivetti.
 *
 * Accessibilità: la parte animata è `aria-hidden`, quindi chi usa il
 * componente deve dare un nome accessibile al contenitore, di norma un
 * `aria-label` sul titolo.
 */

/** Durata della planata da fine riga a inizio riga successiva, in secondi. */
const RETURN_DURATION = 0.24;

/** Frazione di carattere in cui la lettera si accende, appena prima che il cursore la superi. */
const INK_IN = 0.6;

/**
 * Altezza del cursore, in em e a cavallo della linea di base.
 *
 * Non si può usare il rettangolo del carattere: Instrument Serif dichiara
 * ascendenti e discendenti generose (~1.3em in tutto) e il cursore finirebbe
 * per svettare sopra le maiuscole. Questi due valori lo tengono all'altezza
 * delle maiuscole, con un filo di respiro sotto la linea di base.
 */
const CARET_ABOVE_BASELINE = 0.74;
const CARET_BELOW_BASELINE = 0.1;

interface CaretSpot {
  x: number;
  y: number;
  height: number;
}

const ORIGIN: CaretSpot = { x: 0, y: 0, height: 0 };

interface TypewriterProps {
  /** Segmenti di testo: fra l'uno e l'altro viene inserito un `<br>`. */
  segments: string[];
  /** Classi del `<br>` fra i segmenti, per interruzioni responsive. */
  breakClassName?: string;
  /** Velocità di battitura, in caratteri al secondo. */
  speed?: number;
  /** Attesa prima della prima lettera, in secondi. */
  delay?: number;
  className?: string;
}

export function Typewriter({
  segments,
  breakClassName,
  speed = 36,
  delay = 0.25,
  className,
}: TypewriterProps) {
  const shouldReduceMotion = useReducedMotion();
  const containerRef = useRef<HTMLSpanElement>(null);
  const baselineRef = useRef<HTMLSpanElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  /** `spots[k]` è il posto che il cursore occupa dopo k lettere. */
  const spots = useRef<CaretSpot[]>([]);
  /** Indici dei caratteri che cadono a capo, misurati sul layout reale. */
  const breaks = useRef<number[]>([]);
  const [phase, setPhase] = useState<"typing" | "done">("typing");

  // I segmenti arrivano quasi sempre come literal: la chiave testuale evita di
  // ricalcolare le lettere a ogni render solo perché l'array ha nuova identità.
  const key = segments.join("\n");
  const lines = useMemo(() => {
    let index = 0;
    return key
      .split("\n")
      .map((segment) =>
        Array.from(segment).map((char) => ({ char, index: index++ })),
      );
  }, [key]);
  const total = lines.reduce((count, line) => count + line.length, 0);

  const progress = useMotionValue(0);
  const caretX = useMotionValue(0);
  const caretY = useMotionValue(0);
  const caretHeight = useMotionValue(0);

  const syncCaret = useCallback(
    (written: number) => {
      const list = spots.current;
      if (list.length === 0) return;

      const clamped = Math.min(Math.max(written, 0), list.length - 1);
      const index = Math.min(Math.floor(clamped), list.length - 2);
      const from = list[index] ?? ORIGIN;
      const to = list[index + 1] ?? from;
      const t = clamped - index;

      caretX.set(from.x + (to.x - from.x) * t);
      caretY.set(from.y + (to.y - from.y) * t);
      caretHeight.set(to.height || from.height);
    },
    [caretX, caretY, caretHeight],
  );

  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const origin = container.getBoundingClientRect();
    const next: CaretSpot[] = [];
    let last = ORIGIN;

    // La sonda è un elemento vuoto allineato alla linea di base: il suo bordo
    // dice dove passa la base della prima riga, e da lì si ricava di quanto
    // scendere sotto il bordo alto di ogni carattere per trovare la sua.
    const probe = baselineRef.current?.getBoundingClientRect();
    const fontSize = Number.parseFloat(getComputedStyle(container).fontSize);
    const caretSize = (CARET_ABOVE_BASELINE + CARET_BELOW_BASELINE) * fontSize;

    /** Divario fra il bordo alto di un carattere e la sua linea di base. */
    let toBaseline: number | null = null;

    charRefs.current.length = total;
    for (let i = 0; i < total; i++) {
      const rect = charRefs.current[i]?.getBoundingClientRect();
      // Gli spazi a fine riga collassano e non hanno un rettangolo utile: in
      // quel caso il cursore resta dove l'ha lasciato la lettera precedente.
      if (!rect || rect.height === 0) {
        next[i + 1] = last;
        continue;
      }
      // La sonda vive sulla prima riga: il divario si misura sul primo
      // carattere utile e da lì vale per tutte, che hanno lo stesso font alla
      // stessa dimensione.
      toBaseline ??= probe ? probe.bottom - rect.top : rect.height;
      const top =
        rect.top - origin.top + toBaseline - CARET_ABOVE_BASELINE * fontSize;

      if (i === 0) {
        next[0] = { x: rect.left - origin.left, y: top, height: caretSize };
      }
      last = {
        x: Math.min(rect.right - origin.left, origin.width),
        y: top,
        height: caretSize,
      };
      next[i + 1] = last;
    }

    next[0] ??= last;
    spots.current = next;
    breaks.current = next.reduce<number[]>((found, spot, i) => {
      const previous = next[i - 1];
      if (previous && Math.abs(spot.y - previous.y) > 0.5) found.push(i - 1);
      return found;
    }, []);

    syncCaret(progress.get());
  }, [progress, syncCaret, total]);

  useMotionValueEvent(progress, "change", syncCaret);

  useEffect(() => {
    measure();

    const container = containerRef.current;
    const observer = new ResizeObserver(measure);
    if (container) observer.observe(container);
    // Il font display arriva dopo il primo paint: senza questa seconda misura
    // le coordinate resterebbero quelle del fallback di sistema.
    document.fonts?.ready.then(measure);

    if (shouldReduceMotion || total === 0) {
      progress.set(total);
      setPhase("done");
      return () => observer.disconnect();
    }

    progress.set(0);
    setPhase("typing");
    const script = writeScript(breaks.current, total, speed);
    const controls = animate(progress, script.keyframes, {
      duration: script.duration,
      times: script.times,
      ease: script.ease,
      delay,
      onComplete: () => setPhase("done"),
    });

    return () => {
      controls.stop();
      observer.disconnect();
    };
  }, [delay, measure, progress, shouldReduceMotion, speed, total]);

  return (
    <span
      ref={containerRef}
      aria-hidden
      className={cn("relative block", className)}
    >
      <span ref={baselineRef} className="inline-block h-0 w-0 align-baseline" />
      {lines.map((line, lineIndex) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: i segmenti sono statici
        <Fragment key={lineIndex}>
          {lineIndex > 0 ? <br className={breakClassName} /> : null}
          {line.map(({ char, index }) => (
            <Char
              key={index}
              ref={(element) => {
                charRefs.current[index] = element;
              }}
              char={char}
              index={index}
              progress={progress}
              instant={shouldReduceMotion === true}
            />
          ))}
        </Fragment>
      ))}

      {shouldReduceMotion ? null : (
        <motion.span
          className="pointer-events-none absolute top-0 left-0 w-[0.06em] rounded-full bg-current"
          style={{ x: caretX, y: caretY, height: caretHeight }}
          animate={
            phase === "done"
              ? { opacity: 0 }
              : { opacity: [1, 1, 0.05, 0.05, 1] }
          }
          transition={
            phase === "done"
              ? { duration: DURATION.fast, ease: EASE }
              : {
                  duration: 1.1,
                  times: [0, 0.35, 0.5, 0.85, 1],
                  ease: "easeInOut",
                  repeat: Number.POSITIVE_INFINITY,
                }
          }
        />
      )}
    </span>
  );
}

/**
 * Il copione della battitura: quanti caratteri a che istante.
 *
 * Ogni tratto scritto scorre a velocità costante; ogni ritorno a capo è un
 * tratto a sé, lungo `RETURN_DURATION` e con una curva morbida, perché è
 * l'unico momento in cui il cursore deve attraversare mezzo titolo.
 */
function writeScript(breaks: number[], total: number, speed: number) {
  const steps: {
    to: number;
    duration: number;
    ease: "linear" | "easeInOut";
  }[] = [];
  let from = 0;

  for (const index of breaks) {
    if (index > from) {
      steps.push({
        to: index,
        duration: (index - from) / speed,
        ease: "linear",
      });
    }
    steps.push({ to: index + 1, duration: RETURN_DURATION, ease: "easeInOut" });
    from = index + 1;
  }
  if (total > from) {
    steps.push({ to: total, duration: (total - from) / speed, ease: "linear" });
  }

  const duration = steps.reduce((sum, step) => sum + step.duration, 0);
  const keyframes = [0];
  const times = [0];
  let elapsed = 0;

  for (const step of steps) {
    elapsed += step.duration;
    keyframes.push(step.to);
    times.push(elapsed / duration);
  }

  return { keyframes, times, duration, ease: steps.map((step) => step.ease) };
}

interface CharProps {
  char: string;
  index: number;
  progress: MotionValue<number>;
  instant: boolean;
  ref: Ref<HTMLSpanElement>;
}

/**
 * Una lettera. Si accende sul finire del proprio carattere, così resta sempre
 * un soffio dietro al cursore invece di comparirgli sotto.
 */
function Char({ char, index, progress, instant, ref }: CharProps) {
  const opacity = useTransform(progress, [index + INK_IN, index + 1], [0, 1]);

  return (
    <motion.span ref={ref} style={{ opacity: instant ? 1 : opacity }}>
      {char}
    </motion.span>
  );
}
