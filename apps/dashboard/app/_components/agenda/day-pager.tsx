"use client";

import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import {
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { useIsMobile } from "@/hooks/use-mobile";
import { EASE_OUT } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * Da telefono si cambia giorno scorrendo di lato la giornata, come le pagine
 * di un calendario. Da desktop non si trascina niente: si sceglie dalla
 * striscia, come prima.
 *
 * I giorni stanno in fila su una pista, ognuno largo quanto lo schermo e
 * messo al suo posto (`left: indice × 100%`); la pista scorre con il dito.
 * Ai lati del giorno scelto ci sono già il precedente e il successivo, con le
 * loro partite: mentre si trascina si vede arrivare il giorno vero, non un
 * segnaposto. Gli altri giorni non si disegnano.
 *
 * Il gesto parte da tutta la pagina, non solo dalla giornata: anche dallo
 * spazio vuoto sotto un giorno con poche partite (`useDaySwipe`, che dà la
 * superficie da cui si trascina). Tranne la striscia dei giorni, che scorre
 * di lato per conto suo.
 * - In verticale la pagina scorre come sempre. La superficie ha
 *   `touch-action: pan-y`: il browser tiene per sé lo scorrimento verticale,
 *   e un gesto partito di lato non fa più scorrere la pagina finché non si
 *   alza il dito. `dragDirectionLock` fa il contrario: partito in verticale,
 *   la giornata resta ferma.
 * - Lasciando, si passa al giorno accanto se lo si è tirato oltre un quinto
 *   dello schermo o con un colpo veloce; altrimenti si torna al proprio
 *   posto. La molla parte con la velocità del dito, senza rimbalzo: la
 *   pagina continua il gesto invece di ripartire da ferma.
 * - Il primo e l'ultimo giorno resistono, elastici: non c'è niente oltre.
 * - Il giorno cambia appena si lascia (la striscia in alto lo segue subito),
 *   mentre la pista finisce di posarsi.
 *
 * Il giorno può cambiare anche da fuori (la striscia, un link): se è quello
 * accanto la pista scorre, altrimenti salta. Un giorno che nella striscia non
 * c'è (una prenotazione passata, aperta da una notifica) si mostra da solo,
 * senza giorni accanto.
 */

/**
 * La superficie da cui si trascina la giornata: la si stende sull'intera
 * pagina con `surfaceProps`. Chi non deve avviare il gesto (la striscia dei
 * giorni, che scorre da sé) porta `data-swipe-ignore`.
 */
export function useDaySwipe() {
  const controls = useDragControls();
  const isMobile = useIsMobile();
  /** Un trascinamento appena finito: il tocco non apre la riga sotto il dito. */
  const dragged = useRef(false);

  const surfaceProps = {
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (!isMobile) return;
      if (
        event.target instanceof Element &&
        event.target.closest("[data-swipe-ignore]")
      ) {
        return;
      }
      controls.start(event);
    },
    onClickCapture: (event: MouseEvent<HTMLElement>) => {
      if (!dragged.current) return;
      event.stopPropagation();
      event.preventDefault();
    },
  };

  return { controls, isMobile, dragged, surfaceProps };
}

type DaySwipe = ReturnType<typeof useDaySwipe>;

/** Oltre questa frazione dello schermo il giorno cambia. */
const DISTANCE = 0.22;
/** O oltre questa velocità, in px/s: un colpo breve basta. */
const VELOCITY = 400;

export function DayPager({
  swipe,
  days: strip,
  selected,
  onSelect,
  renderDay,
}: {
  swipe: DaySwipe;
  days: readonly string[];
  selected: string;
  onSelect: (day: string) => void;
  renderDay: (day: string) => ReactNode;
}) {
  const { isMobile, dragged } = swipe;
  const reduce = useReducedMotion();
  const viewport = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const x = useMotionValue(0);

  const days = strip.includes(selected) ? strip : [selected];
  const index = days.indexOf(selected);
  const hasPrev = index > 0;
  const hasNext = index < days.length - 1;

  /** La pagina su cui la pista è ferma, o verso cui sta andando. */
  const page = useRef(index);
  /** Il dito è sulla pista. */
  const dragging = useRef(false);
  /**
   * Mentre la pista si muove i giorni accanto si vedono interi, anche più
   * alti di quello scelto. Da ferma si tagliano: un giorno lungo, fuori
   * schermo, allungherebbe la pagina di uno spazio vuoto.
   */
  const [moving, setMoving] = useState(false);

  const settle = useCallback(
    (to: number, velocity = 0) => {
      setMoving(true);
      animate(
        x,
        to,
        reduce
          ? { duration: 0.2, ease: EASE_OUT }
          : { type: "spring", visualDuration: 0.3, bounce: 0, velocity },
      ).then(() => {
        // Una molla interrotta da un nuovo trascinamento non spegne nulla:
        // il dito è ancora lì.
        if (!dragging.current) setMoving(false);
      });
    },
    [x, reduce],
  );

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () => setWidth(element.offsetWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // La pista segue il giorno scelto: al primo giro, quando cambia la misura
  // dello schermo e quando il giorno cambia da fuori. Un giorno cambiato dal
  // dito è già in viaggio (`page` lo sa) e non va toccato.
  useLayoutEffect(() => {
    if (!width) return;
    const to = -index * width;

    if (page.current === index) {
      if (!x.isAnimating()) x.set(to);
      return;
    }

    const adjacent = Math.abs(page.current - index) === 1;
    page.current = index;
    if (isMobile && adjacent) settle(to);
    else x.set(to);
  }, [index, width, isMobile, x, settle]);

  // Da desktop non si trascina: basta il giorno scelto.
  const visible = (isMobile ? [index - 1, index, index + 1] : [index]).filter(
    (position) => position >= 0 && position < days.length,
  );

  return (
    <div
      ref={viewport}
      className={cn(
        "-mx-4 overflow-x-clip md:mx-0",
        !moving && "overflow-y-clip",
      )}
    >
      <motion.div
        drag={isMobile ? "x" : false}
        dragControls={swipe.controls}
        dragListener={false}
        dragDirectionLock
        dragMomentum={false}
        dragElastic={0.18}
        dragConstraints={{
          left: -(index + (hasNext ? 1 : 0)) * width,
          right: -(index - (hasPrev ? 1 : 0)) * width,
        }}
        onDragStart={() => {
          dragged.current = true;
          dragging.current = true;
          setMoving(true);
        }}
        onDragEnd={(_, { offset, velocity }) => {
          dragging.current = false;
          let next = index;
          if (
            hasNext &&
            offset.x < 0 &&
            (offset.x < -width * DISTANCE || velocity.x < -VELOCITY)
          ) {
            next = index + 1;
          } else if (
            hasPrev &&
            offset.x > 0 &&
            (offset.x > width * DISTANCE || velocity.x > VELOCITY)
          ) {
            next = index - 1;
          }

          page.current = next;
          settle(-next * width, velocity.x);
          if (next !== index) onSelect(days[next]);

          // Il clic del dito che si alza arriva prima di qui: lo scarta la
          // superficie (`surfaceProps.onClickCapture`).
          window.setTimeout(() => {
            dragged.current = false;
          });
        }}
        style={{ x }}
        className="relative"
      >
        {visible.map((position) => {
          const current = position === index;
          return (
            <div
              key={days[position]}
              // I giorni accanto si vedono ma non si toccano né si leggono:
              // fuori schermo per il Tab e per i lettori di schermo.
              inert={!current}
              style={{ left: `${position * 100}%` }}
              className={cn(
                "w-full px-4 md:px-0",
                current ? "relative" : "absolute top-0",
              )}
            >
              {renderDay(days[position])}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
