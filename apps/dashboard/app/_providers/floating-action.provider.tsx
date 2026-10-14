"use client";

import type { LucideIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

/**
 * Il pulsante fluttuante della dashboard da telefono: uno solo, sopra la
 * barra in basso, dichiarato dalla pagina che lo vuole.
 *
 * Vive nel layout e non nella pagina perché deve sopravvivere al cambio di
 * pagina quel tanto che basta per andarsene: se lo disegnasse la pagina,
 * sparirebbe di colpo insieme a lei. Così invece la pagina lo dichiara con
 * `useFloatingAction`, e quando la si lascia il pulsante rientra dietro la
 * barra mentre quello della pagina nuova, se c'è, ne esce.
 *
 * Il movimento è quello di un oggetto che sta *dietro* la barra: sale dal
 * suo bordo, passa sotto il vetro traslucido sfocato e mette a fuoco man mano
 * che emerge. Entrata con una molla senza rimbalzo, uscita più breve: chi
 * cambia pagina guarda già altrove.
 */

export interface FloatingAction {
  /** Identifica il pulsante: cambiando chiave, il vecchio esce e il nuovo entra. */
  key: string;
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

type Register = (action: FloatingAction | null) => void;

const FloatingActionContext = createContext<Register | null>(null);

/**
 * Dichiara il pulsante fluttuante della pagina, finché la pagina è a video.
 * `onClick` può cambiare a ogni disegno: si legge sempre l'ultimo.
 */
export function useFloatingAction(action: FloatingAction) {
  const register = useContext(FloatingActionContext);
  const latest = useRef(action);
  latest.current = action;

  const { key, label, icon } = action;

  useEffect(() => {
    if (!register) return;
    register({ key, label, icon, onClick: () => latest.current.onClick() });
    return () => register(null);
  }, [register, key, label, icon]);
}

export default function FloatingActionProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [action, setAction] = useState<FloatingAction | null>(null);
  const reduce = useReducedMotion();

  // Dietro la barra: abbastanza in basso da partire nascosto dal suo vetro.
  const hidden = reduce
    ? { opacity: 0 }
    : { opacity: 0, y: 56, scale: 0.94, filter: "blur(8px)" };

  return (
    <FloatingActionContext.Provider value={setAction}>
      {children}

      {/* Sotto la barra in basso (z-40): è lei a coprirlo mentre entra ed esce. */}
      <div className="pointer-events-none fixed right-4 bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+4.75rem)] z-30 md:hidden">
        <AnimatePresence initial={false}>
          {action && (
            <motion.button
              key={action.key}
              // Il tour indica il pulsante col suo nome («assign-points»).
              data-tour={action.key}
              type="button"
              onClick={action.onClick}
              initial={hidden}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{
                ...hidden,
                transition: reduce
                  ? { duration: 0.12 }
                  : { duration: 0.22, ease: [0.4, 0, 1, 1] },
              }}
              transition={
                reduce
                  ? { duration: 0.15 }
                  : { type: "spring", bounce: 0, duration: 0.5 }
              }
              whileTap={reduce ? undefined : { scale: 0.95 }}
              className="bg-primary text-primary-foreground pointer-events-auto absolute right-0 bottom-0 flex h-12 items-center gap-2 rounded-full pr-5 pl-4 text-[15px] font-medium whitespace-nowrap shadow-[0_10px_30px_-10px_oklch(0.2_0_0/0.5)] will-change-transform"
            >
              <action.icon className="size-5" />
              {action.label}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </FloatingActionContext.Provider>
  );
}
