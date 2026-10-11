"use client";

import { ChevronLeft, X } from "lucide-react";
import {
  AnimatePresence,
  type AnimationPlaybackControls,
  animate,
  motion,
  useReducedMotion,
} from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import {
  type RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { cn } from "@/lib/utils";

import { activeHref } from "../nav";

import {
  computeScene,
  identityScene,
  lerpScene,
  measureTarget,
  type Rect,
  type Scene,
  sameRect,
} from "./scene";
import { copy, TOUR_STEPS } from "./steps";
import { TourLocation } from "./tour-location";
import { TourText } from "./tour-text";

/**
 * Il tour a schermo: la dashboard vera, rimpicciolita in una cornice, e
 * sotto il pannello con le spiegazioni.
 *
 * Funziona come le storie di Instagram, che quasi tutti hanno già in mano:
 * si tocca per andare avanti, sul bordo sinistro per tornare indietro, e i
 * trattini in alto dicono quanto manca. Per chi quel gesto non lo conosce
 * ci sono comunque «Avanti» e «Indietro», scritti per esteso.
 *
 * La dashboard dentro la cornice è quella vera, solo resa intoccabile
 * (`inert`): la telecamera si avvicina alla parte di cui si parla, il resto
 * si vela e la parte giusta resta accesa. Le pagine cambiano davvero, così
 * chi guarda vede anche come ci si arriva.
 *
 * Il movimento è a molla e parte sempre da dove le cose sono in quel momento:
 * chi tocca in fretta non aspetta la fine di un'animazione, la telecamera
 * cambia strada a metà. Entrata più lunga (è il momento in cui la dashboard
 * diventa «oggetto da guardare»), uscita più breve. Con «riduci movimento»
 * la telecamera salta e restano solo le dissolvenze del testo.
 */

/** Il fondo dietro la cornice, anche per le barre del browser. */
const STAGE_COLOR = "#0f0f0f";

/** Una curva forte in uscita, per le dissolvenze brevi. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

const MOBILE_QUERY = "(max-width: 767px)";

export function TourOverlay({
  stage,
  closing,
  onClose,
  onClosed,
}: {
  /** L'elemento che contiene la dashboard: è lui che si rimpicciolisce. */
  stage: RefObject<HTMLDivElement | null>;
  /** Il tour si sta chiudendo: la dashboard torna a tutto schermo. */
  closing: boolean;
  /** Chiusura chiesta da chi guarda, o tour finito. */
  onClose: () => void;
  /** La dashboard è tornata al suo posto: si può smontare. */
  onClosed: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const reduce = useReducedMotion() ?? false;
  const mobile = useMediaQuery(MOBILE_QUERY);

  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const step = TOUR_STEPS[index];
  const last = index === TOUR_STEPS.length - 1;

  // La pagina di ogni step (chi non ne dichiara una resta su quella di
  // prima) e lo step da cui si arriva: se le due pagine differiscono, la
  // cornice ha cambiato schermata e va detto.
  const [startPage] = useState(() => activeHref(pathname) ?? "/");
  const [from, setFrom] = useState<number | null>(null);
  const pages = useMemo(() => {
    let page = startPage;
    return TOUR_STEPS.map((item) => {
      page = item.route ?? page;
      return page;
    });
  }, [startPage]);
  const page = pages[index];
  const pageChanged = page !== (from === null ? startPage : pages[from]);

  const areaRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const holeRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const animation = useRef<AnimationPlaybackControls | null>(null);
  const entered = useRef(false);

  /** Disegna una scena: dashboard, cornice e riquadro acceso. */
  const write = useCallback(
    (scene: Scene) => {
      sceneRef.current = scene;
      const el = stage.current;
      const frame = frameRef.current;
      const hole = holeRef.current;
      if (!el || !frame || !hole) return;

      const { s, tx, ty, W, H } = scene;
      el.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${s})`;
      // Il ritaglio sta prima della trasformazione: la cornice va riportata
      // in coordinate della dashboard a grandezza naturale.
      const top = (scene.fy - ty) / s;
      const left = (scene.fx - tx) / s;
      const right = W - (scene.fx + scene.fw - tx) / s;
      const bottom = H - (scene.fy + scene.fh - ty) / s;
      el.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round ${scene.r / s}px)`;

      frame.style.left = `${scene.fx}px`;
      frame.style.top = `${scene.fy}px`;
      frame.style.width = `${scene.fw}px`;
      frame.style.height = `${scene.fh}px`;
      frame.style.borderRadius = `${scene.r}px`;
      // Il filo chiaro attorno alla cornice compare man mano che la
      // dashboard si stacca dai bordi dello schermo.
      frame.style.boxShadow = `0 0 0 1px rgb(255 255 255 / ${0.14 * Math.min(1, scene.r / 12)})`;

      hole.style.left = `${scene.hx - scene.fx}px`;
      hole.style.top = `${scene.hy - scene.fy}px`;
      hole.style.width = `${scene.hw}px`;
      hole.style.height = `${scene.hh}px`;
      hole.style.borderRadius = `${scene.hr}px`;
      hole.style.boxShadow = `0 0 0 2px rgb(255 255 255 / ${0.95 * scene.dim}), 0 0 0 200vmax rgb(0 0 0 / ${0.55 * scene.dim})`;
    },
    [stage],
  );

  /** Porta la scena a `to`, partendo da dove si trova adesso. */
  const go = useCallback(
    (to: Scene, duration: number, onDone?: () => void) => {
      animation.current?.stop();
      const from = sceneRef.current ?? to;
      if (reduce) {
        write(to);
        onDone?.();
        return;
      }
      animation.current = animate(0, 1, {
        type: "spring",
        visualDuration: duration,
        bounce: 0,
        onUpdate: (progress) => write(lerpScene(from, to, progress)),
        onComplete: onDone,
      });
    },
    [reduce, write],
  );

  const measure = useCallback(() => {
    const el = stage.current;
    const area = areaRef.current;
    if (!el || !area) return null;
    const box = area.getBoundingClientRect();
    return {
      W: el.clientWidth,
      H: el.clientHeight,
      area: { x: box.left, y: box.top, w: box.width, h: box.height },
    };
  }, [stage]);

  const sceneFor = useCallback(
    (
      space: { W: number; H: number; area: Rect },
      target: Rect | null,
      shape?: "pill",
    ) =>
      computeScene({
        ...space,
        target,
        radius: mobile ? 28 : 22,
        maxScale: mobile ? 1 : 1.3,
        context: mobile ? 20 : 48,
        holePadding: 8,
        holeRadius: shape === "pill" ? "pill" : 16,
      }),
    [mobile],
  );

  // La dashboard diventa il contenuto della cornice: ferma, intoccabile, su
  // fondo scuro. All'uscita torna esattamente com'era.
  useLayoutEffect(() => {
    const el = stage.current;
    if (!el) return;

    window.scrollTo({ top: 0, behavior: "instant" });

    const html = document.documentElement;
    const body = document.body;
    const meta = document.querySelector("meta[name=theme-color]");
    const previous = {
      style: el.getAttribute("style"),
      html: html.style.backgroundColor,
      body: body.style.backgroundColor,
      meta: meta?.getAttribute("content") ?? null,
    };

    el.style.position = "fixed";
    el.style.inset = "0";
    el.style.zIndex = "50";
    el.style.transformOrigin = "0 0";
    el.inert = true;
    html.style.backgroundColor = STAGE_COLOR;
    body.style.backgroundColor = STAGE_COLOR;
    meta?.setAttribute("content", STAGE_COLOR);

    write(identityScene(el.clientWidth, el.clientHeight));
    nextRef.current?.focus({ preventScroll: true });

    return () => {
      animation.current?.stop();
      if (previous.style === null) el.removeAttribute("style");
      else el.setAttribute("style", previous.style);
      el.inert = false;
      html.style.backgroundColor = previous.html;
      body.style.backgroundColor = previous.body;
      if (previous.meta !== null) meta?.setAttribute("content", previous.meta);
    };
  }, [stage, write]);

  // Lo step: si va sulla sua pagina, si aspetta che l'elemento ci sia e si
  // porta la telecamera lì. Poi si continua a guardarlo: se si sposta (la
  // pagina finisce di caricare, il pulsante fluttuante sale, lo schermo
  // ruota) la telecamera lo segue da dove si trova.
  useEffect(() => {
    if (closing) return;
    const current = TOUR_STEPS[index];

    if (current.route && pathname !== current.route) {
      // Mentre la pagina nuova arriva, si arretra sulla pagina intera: si vede
      // il cambio di sezione, poi la telecamera si avvicina di nuovo.
      const space = measure();
      if (space) go(sceneFor(space, null), entered.current ? 0.55 : 0.75);
      entered.current = true;
      router.push(current.route);
      return;
    }

    const started = performance.now();
    let placed = false;
    let lastTarget: Rect | null = null;
    let lastArea: Rect | null = null;
    let lastSize = "";
    let frame = 0;

    const tick = () => {
      frame = requestAnimationFrame(tick);
      const space = measure();
      const camera = sceneRef.current;
      const el = stage.current;
      if (!space || !camera || !el) return;

      const target = current.target
        ? measureTarget(el, current.target, camera)
        : null;
      // L'elemento non c'è ancora (la pagina carica): si aspetta un po', poi
      // si ripiega sulla pagina intera piuttosto che restare fermi.
      if (current.target && !target && performance.now() - started < 4000) {
        return;
      }

      const size = `${space.W}x${space.H}`;
      if (
        placed &&
        size === lastSize &&
        sameRect(space.area, lastArea) &&
        sameRect(target, lastTarget)
      ) {
        return;
      }

      placed = true;
      lastSize = size;
      lastArea = space.area;
      lastTarget = target;
      go(sceneFor(space, target, current.shape), entered.current ? 0.55 : 0.75);
      entered.current = true;
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [index, pathname, closing, measure, go, sceneFor, router, stage]);

  // In chiusura la dashboard si riallarga a tutto schermo, più in fretta di
  // come si era rimpicciolita: chi chiude ha già la testa al lavoro.
  useEffect(() => {
    if (!closing) return;
    const el = stage.current;
    if (!el) return onClosed();
    go(identityScene(el.clientWidth, el.clientHeight), 0.45, onClosed);
  }, [closing, go, onClosed, stage]);

  const next = useCallback(() => {
    if (closing) return;
    if (last) return onClose();
    setFrom(index);
    setDirection(1);
    setIndex((value) => Math.min(value + 1, TOUR_STEPS.length - 1));
  }, [closing, last, onClose, index]);

  const back = useCallback(() => {
    if (closing || index === 0) return;
    setFrom(index);
    setDirection(-1);
    setIndex((value) => Math.max(value - 1, 0));
  }, [closing, index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") back();
      else if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, back, onClose]);

  return (
    <>
      {/* Il velo e il riquadro acceso, ritagliati sulla cornice. */}
      <div
        ref={frameRef}
        aria-hidden
        className="pointer-events-none fixed z-[60] overflow-hidden"
      >
        <div ref={holeRef} className="absolute">
          {step.target && !reduce && (
            <span
              key={step.id}
              className="tour-ping absolute inset-0 rounded-[inherit]"
            />
          )}
        </div>
      </div>

      {/*
       * Tutto lo schermo è un pulsante: un tocco va avanti, sul bordo
       * sinistro torna indietro. I pulsanti del pannello fermano il tocco.
       * Da tastiera ci sono le frecce (ascoltate sulla finestra) e i pulsanti.
       */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: le frecce sono ascoltate sulla finestra, «Avanti» e «Indietro» sono pulsanti veri. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-tour-title"
        aria-describedby="dashboard-tour-body"
        className="fixed inset-0 z-[61] flex touch-manipulation flex-col select-none [-webkit-tap-highlight-color:transparent]"
        onClick={(event) => {
          if (event.clientX < window.innerWidth * 0.3 && index > 0) back();
          else next();
        }}
      >
        <div className="mt-[calc(env(safe-area-inset-top)+0.5rem)] h-9 shrink-0 md:mt-5">
          <AnimatePresence>
            {!closing && (
              <motion.div
                key="location"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.3, delay: reduce ? 0 : 0.25 }}
              >
                <TourLocation
                  href={page}
                  changed={pageChanged}
                  reduce={reduce}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Lo spazio della cornice: lo decide il CSS, il codice lo misura. */}
        <div
          ref={areaRef}
          className="mx-3 mt-2 min-h-0 flex-1 md:mx-6 md:mt-3"
        />

        <AnimatePresence>
          {!closing && (
            <motion.div
              key="panel"
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, transform: "translateY(40%)" }
              }
              animate={{ opacity: 1, transform: "translateY(0%)" }}
              exit={
                reduce
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : {
                      opacity: 0,
                      transform: "translateY(30%)",
                      transition: { duration: 0.25, ease: EASE_OUT },
                    }
              }
              transition={
                reduce
                  ? { duration: 0.2 }
                  : { type: "spring", visualDuration: 0.6, bounce: 0 }
              }
              className="flex min-h-[calc(20rem+env(safe-area-inset-bottom))] shrink-0 flex-col px-5 pt-5 pb-[max(1rem,env(safe-area-inset-bottom))] text-white md:min-h-60 md:px-6 md:pt-6 md:pb-6"
            >
              <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col">
                <div className="flex items-center gap-4">
                  <Progress index={index} reduce={reduce} />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onClose();
                    }}
                    className="-mr-2 flex h-9 shrink-0 items-center gap-1 rounded-full px-3 text-[14px] font-medium text-white/70 transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none active:scale-[0.97]"
                  >
                    <X className="size-4" />
                    Chiudi
                  </button>
                </div>

                <div className="mt-5 grid flex-1" aria-live="polite">
                  <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                      key={step.id}
                      custom={direction}
                      variants={reduce ? fadeVariants : slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      className="[grid-area:1/1]"
                    >
                      <p className="text-[13px] font-medium text-white/50">
                        {step.eyebrow}
                        <span className="tabular-nums">
                          {" "}
                          · {index + 1} di {TOUR_STEPS.length}
                        </span>
                      </p>
                      <h2
                        id="dashboard-tour-title"
                        className="mt-1.5 text-[1.375rem] leading-[1.2] font-semibold tracking-[-0.02em] text-balance md:text-[1.625rem]"
                      >
                        {copy(step.title, mobile)}
                      </h2>
                      <p
                        id="dashboard-tour-body"
                        className="mt-2 max-w-[60ch] text-base leading-[1.7] text-pretty text-white/70 md:text-[17px]"
                      >
                        <TourText
                          text={copy(step.body, mobile)}
                          reduce={reduce}
                        />
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                <div className="mt-4 flex items-center gap-3 md:justify-end">
                  <button
                    type="button"
                    tabIndex={index === 0 ? -1 : undefined}
                    aria-hidden={index === 0 || undefined}
                    onClick={(event) => {
                      event.stopPropagation();
                      back();
                    }}
                    className={cn(
                      "flex h-12 shrink-0 items-center gap-1 rounded-full bg-white/10 pr-5 pl-3.5 text-[15px] font-medium transition-[opacity,background-color,transform] duration-200 hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none active:scale-[0.97]",
                      index === 0 && "pointer-events-none opacity-0",
                    )}
                  >
                    <ChevronLeft className="size-5" />
                    Indietro
                  </button>
                  <button
                    ref={nextRef}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      next();
                    }}
                    className="h-12 flex-1 rounded-full bg-white px-6 text-[15px] font-semibold text-neutral-950 transition-[background-color,transform] duration-150 hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f0f0f] focus-visible:outline-none active:scale-[0.97] md:w-44 md:flex-none"
                  >
                    {last ? "Inizia" : "Avanti"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

/**
 * I trattini delle storie: pieni quelli visti, vuoti quelli da vedere. Il
 * trattino dello step che si apre si riempie da sinistra.
 */
function Progress({ index, reduce }: { index: number; reduce: boolean }) {
  return (
    <div className="flex flex-1 gap-1" aria-hidden>
      {TOUR_STEPS.map((item, position) => (
        <span
          key={item.id}
          className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/20"
        >
          <span
            className={cn(
              "block h-full origin-left rounded-full bg-white",
              !reduce &&
                "transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]",
            )}
            style={{ transform: `scaleX(${position <= index ? 1 : 0})` }}
          />
        </span>
      ))}
    </div>
  );
}

/**
 * Il testo scorre nel verso in cui si va, come una pagina sfogliata; la
 * sfocatura cuce il vecchio e il nuovo mentre si incrociano.
 */
const slideVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    transform: `translateX(${24 * direction}px)`,
    filter: "blur(6px)",
  }),
  center: {
    opacity: 1,
    transform: "translateX(0px)",
    filter: "blur(0px)",
    transition: { type: "spring", visualDuration: 0.45, bounce: 0 },
  },
  exit: (direction: number) => ({
    opacity: 0,
    transform: `translateX(${-16 * direction}px)`,
    filter: "blur(4px)",
    transition: { duration: 0.18, ease: EASE_OUT },
  }),
} as const;

const fadeVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
} as const;

function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
