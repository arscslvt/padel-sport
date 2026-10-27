"use client";

import {
  AnimatePresence,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";
import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { MOMENTS } from "@/components/product/moments";
import { headingVariants } from "@/components/site/heading";
import { BLUR, EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Quanto resta in vista ogni momento: il tempo che la scena finisca e si legga. */
const STORY_MS = 6500;

/** Oltre questa durata la pressione è una pausa, non un tocco. */
const HOLD_MS = 220;

/**
 * La giornata al club da telefono: cinque momenti in una schermata sola,
 * come le storie.
 *
 * Le barre in alto dicono dove si è e quanto manca. Ogni momento resta in
 * vista il tempo di finire la sua scena, poi passa al successivo; dopo
 * l'ultimo ricomincia. Un tocco a destra va avanti, a sinistra torna
 * indietro; tenendo premuto si ferma, e lasciando riparte da dove era.
 * Si ferma anche quando le storie escono dallo schermo o la scheda del
 * browser passa in secondo piano: nessuno perde un momento che non ha visto.
 * Con il movimento ridotto non avanza da solo, si sfoglia a tocchi.
 */
export function MomentStories({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.55 });
  // La prima scena parte solo quando le storie si vedono davvero.
  const seen = useInView(ref, { amount: 0.55, once: true });
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [held, setHeld] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  // Chi arriva con la tastiera o uno screen reader ferma l'avanzamento:
  // il testo non deve cambiare mentre lo si sta leggendo.
  const [focused, setFocused] = useState(false);
  const pressedAt = useRef(0);

  useEffect(() => {
    const onVisibility = () => setPageHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const playing = inView && !held && !pageHidden && !focused && !reduce;
  const { time, title, body, Scene } = MOMENTS[index];

  const go = (step: 1 | -1) =>
    setIndex((current) => (current + step + MOMENTS.length) % MOMENTS.length);

  const onPointerDown = (event: PointerEvent) => {
    pressedAt.current = event.timeStamp;
    setHeld(true);
  };
  const release = () => setHeld(false);
  // Un tocco cambia momento; una pressione lunga era solo una pausa. Da
  // tastiera (`detail` a zero) non c'è pressione: si cambia sempre.
  const tap = (step: 1 | -1) => (event: React.MouseEvent) => {
    const heldFor = pressedAt.current ? event.timeStamp - pressedAt.current : 0;
    pressedAt.current = 0;
    if (event.detail !== 0 && heldFor > HOLD_MS) return;
    go(step);
  };

  return (
    <section
      ref={ref}
      aria-roledescription="storie"
      aria-label="Una giornata al club"
      // Solo il fuoco da tastiera ferma le storie: anche un tocco dà il fuoco
      // al tasto, e altrimenti dopo il primo tocco non avanzerebbero più.
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) setFocused(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
      className={cn(
        // Niente scheda attorno: le scene hanno già la loro cornice (il
        // telefono, le schede del gestionale), e una scheda più piccola del
        // telefono che contiene non potrebbe essere concentrica.
        "relative select-none",
        className,
      )}
    >
      {/* Le barre di avanzamento. */}
      <div aria-hidden className="flex gap-1.5">
        {MOMENTS.map((moment, i) => (
          <span
            key={moment.time + moment.title}
            className="h-[3px] flex-1 overflow-hidden rounded-full bg-zinc-200"
          >
            {i < index && (
              <span className="block size-full rounded-full bg-brand" />
            )}
            {i === index && (
              <span
                key={index}
                onAnimationEnd={() => go(1)}
                style={
                  {
                    "--story-duration": `${STORY_MS}ms`,
                    animationPlayState: playing ? "running" : "paused",
                  } as CSSProperties
                }
                className={cn(
                  "block size-full rounded-full bg-brand",
                  reduce ? "" : "story-fill",
                )}
              />
            )}
          </span>
        ))}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={index}
          initial={{
            opacity: 0,
            filter: BLUR.reveal,
            transform: "scale(0.98)",
          }}
          animate={{ opacity: 1, filter: BLUR.none, transform: "scale(1)" }}
          exit={{
            opacity: 0,
            filter: BLUR.soft,
            transform: "scale(1.01)",
            transition: { duration: 0.2, ease: EASE_OUT },
          }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <div className="pt-5">
            <p className="font-mono text-[13px] text-brand tabular-nums">
              {time}
            </p>
            <h3 className={cn(headingVariants({ size: "card" }), "mt-1.5")}>
              {title}
            </h3>
            <p className="mt-2 min-h-[4.5em] text-[15px] leading-relaxed text-muted-foreground">
              {body}
            </p>
          </div>
          {/* Le scene sono superfici: arrivano al margine della banda verde,
              il testo sopra resta sul suo. */}
          <div className="frame-bleed h-[30rem] pt-4">
            {seen ? <Scene /> : null}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Le due metà sono i tasti: avanti a destra, indietro a sinistra. */}
      <div className="absolute inset-x-0 top-4 bottom-0 grid grid-cols-[2fr_3fr]">
        <button
          type="button"
          aria-label="Momento precedente"
          onPointerDown={onPointerDown}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onClick={tap(-1)}
          className="outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
        />
        <button
          type="button"
          aria-label="Momento successivo"
          onPointerDown={onPointerDown}
          onPointerUp={release}
          onPointerLeave={release}
          onPointerCancel={release}
          onClick={tap(1)}
          className="outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-inset"
        />
      </div>
    </section>
  );
}
