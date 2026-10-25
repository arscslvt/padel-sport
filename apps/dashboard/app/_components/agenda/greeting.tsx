"use client";

import { useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { SlotText } from "slot-text/react";
import "slot-text/style.css";

import { CLUB_TIME_ZONE } from "@/lib/booking";
import { EASE } from "@/lib/motion";
import {
  useRememberViewer,
  useStaffFirstName,
  type Viewer,
} from "@/lib/staff-name";

import { dayKey, fullDayLabel } from "./lib";

/**
 * Il titolo dell'agenda, che all'apertura saluta.
 *
 * Per qualche istante dice «Buon pomeriggio, Salvatore», poi torna «Agenda»:
 * il saluto è un benvenuto, il titolo serve a sapere dove si è. Succede una
 * volta per sessione del browser: chi torna sull'agenda dieci volte in
 * un'ora si sentirebbe salutare dieci volte.
 *
 * La sequenza:
 * 1. il saluto si mette a fuoco: da invisibile, sfocato e un filo più in
 *    basso, a nitido e al suo posto (Motion, ease-out lungo);
 * 2. resta fermo, il tempo di leggerlo con calma;
 * 3. le lettere rotolano verso «Agenda» una dopo l'altra, come i rulli di un
 *    contatore (slot-text). Mentre rotolano il titolo si sfoca appena e torna
 *    nitido, e i bordi dei rulli sfumano (globals.css): le lettere che escono
 *    e quelle che entrano si fondono invece di accavallarsi, e non si vede
 *    dove il rullo le taglia.
 * Da telefono la frase intera non ci sta accanto ai pulsanti: fra 2 e 3 il
 * saluto rotola nel nome, con lo stesso movimento.
 *
 * I tempi si contano dall'inizio del saluto, non dal montaggio: se React
 * rimonta il titolo a metà, la sequenza riprende dal punto in cui era.
 *
 * Chi ha chiesto meno animazioni vede le parole cambiare in dissolvenza,
 * senza rotolare né sfocarsi.
 */

const TITLE = "Agenda";
const SESSION_KEY = "dashboard-agenda-greeted";

/** L'entrata del saluto, in secondi. */
const ENTER_S = 1.1;
/** Da desktop, quando il saluto lascia il posto ad «Agenda». */
const TITLE_AT_MS = 4600;
/**
 * Da telefono: il nome arriva appena il saluto si è messo a fuoco, quasi
 * fosse la seconda metà della stessa frase; poi resta qualche istante, il
 * tempo di leggerlo, prima di tornare «Agenda».
 */
const NAME_AT_MS = 1350;
const TITLE_AT_NARROW_MS = 4200;

/**
 * Il rotolamento delle lettere. Lento, con una curva che parte morbida e si
 * posa lunga: la lettera non scatta via, scivola. Ogni lettera parte un
 * soffio dopo la precedente, così la parola cambia come un'onda da sinistra a
 * destra. La lettera nuova entra quasi insieme a quella che esce: il rullo non
 * resta mai vuoto. Un filo di variazione fra una lettera e l'altra
 * (`bounce`), quanto basta perché l'onda non sembri meccanica.
 */
const ROLL = {
  direction: "up",
  duration: 680,
  stagger: 26,
  exitOffset: 30,
  easing: "cubic-bezier(0.45, 0, 0.15, 1)",
  bounce: 0.12,
} as const;

const NO_ROLL = { direction: "up", duration: 0, stagger: 0 } as const;

/**
 * La sfocatura durante il rotolamento: sale morbida fin quando le lettere si
 * incrociano, poi si scioglie in fretta.
 */
const PULSE_RISE = "cubic-bezier(0.45, 0, 0.55, 1)";
const PULSE_FALL = "cubic-bezier(0.22, 1, 0.36, 1)";

const hourFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: CLUB_TIME_ZONE,
  hour: "2-digit",
  hourCycle: "h23",
});

function salute(now: number): string {
  const hour = Number(hourFormat.format(now));
  if (hour >= 5 && hour < 13) return "Buongiorno";
  if (hour >= 13 && hour < 18) return "Buon pomeriggio";
  if (hour >= 18) return "Buonasera";
  // Nel cuore della notte un «buonasera» suona strano, e un «buonanotte» è
  // un congedo: un saluto e basta.
  return "Ciao";
}

/**
 * Il saluto di questa pagina: deciso una volta, all'apertura, e ricordato
 * fuori dal componente. Così un rimontaggio, o il doppio effetto di React in
 * sviluppo, non lo ricomincia e non lo salta.
 */
let plan: { greet: boolean; startedAt: number } | null = null;

function greetingPlan() {
  if (plan) return plan;
  let greeted = false;
  try {
    greeted = window.sessionStorage.getItem(SESSION_KEY) === "1";
    window.sessionStorage.setItem(SESSION_KEY, "1");
  } catch {
    // Senza memoria del browser si saluta a ogni apertura: poco male.
  }
  plan = { greet: !greeted, startedAt: Date.now() };
  return plan;
}

/**
 * - `pending`: il server ha disegnato la pagina, il browser non ha ancora
 *   deciso se salutare. Il titolo c'è ma è invisibile, e tiene il posto.
 * - `salute`, `name`: il saluto (da desktop tutto in `salute`).
 * - `title`: «Agenda».
 */
type Phase = "pending" | "salute" | "name" | "title";

const FOCUSED = {
  opacity: 1,
  filter: "blur(0px)",
  transform: "translateY(0px)",
};

export function AgendaTitle({ viewer }: { viewer?: Viewer | null }) {
  // Dal server, già nella pagina; altrimenti da Clerk o dalla copia nel
  // browser. E la copia si riallinea a chi il server ha riconosciuto.
  const name = useStaffFirstName(viewer);
  useRememberViewer(viewer);
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate<HTMLSpanElement>();
  const [phase, setPhase] = useState<Phase>("pending");
  const [narrow, setNarrow] = useState(false);
  const [greeting] = useState(() => salute(Date.now()));

  // Le animazioni leggono l'impostazione del momento, non quella del render
  // in cui è partita la sequenza.
  const reduceRef = useRef(reduce);
  reduceRef.current = reduce;

  useEffect(() => {
    const node = scope.current;
    const { greet, startedAt } = greetingPlan();
    const isNarrow = window.matchMedia("(max-width: 767px)").matches;
    const titleAt = isNarrow ? TITLE_AT_NARROW_MS : TITLE_AT_MS;
    const elapsed = Date.now() - startedAt;

    if (!greet || elapsed >= titleAt) {
      setPhase("title");
      animate(node, FOCUSED, { duration: 0 });
      return;
    }

    setNarrow(isNarrow);
    setPhase(isNarrow && elapsed >= NAME_AT_MS ? "name" : "salute");

    if (elapsed > 200) {
      // Ripreso a metà: niente seconda entrata.
      animate(node, FOCUSED, { duration: 0 });
    } else if (reduceRef.current) {
      animate(
        node,
        { filter: "blur(0px)", transform: "translateY(0px)" },
        { duration: 0 },
      );
      animate(node, { opacity: 1 }, { duration: 0.4 });
    } else {
      animate(node, FOCUSED, { duration: ENTER_S, ease: EASE });
    }

    const timers: number[] = [];
    if (isNarrow && elapsed < NAME_AT_MS) {
      timers.push(
        window.setTimeout(() => setPhase("name"), NAME_AT_MS - elapsed),
      );
    }
    timers.push(window.setTimeout(() => setPhase("title"), titleAt - elapsed));
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
    };
  }, [animate, scope]);

  const text =
    phase === "pending" || phase === "title"
      ? TITLE
      : narrow
        ? phase === "name" && name
          ? name
          : `${greeting}${name ? "," : ""}`
        : `${greeting}${name ? `, ${name}` : ""}`;

  /**
   * Ogni volta che il testo rotola, il titolo si sfoca e torna nitido: la
   * sfocatura sale morbida fin quando le lettere si incrociano, poi si
   * scioglie in fretta, così la parola nuova è già nitida mentre le ultime
   * lettere si posano. Più lettere cambiano, più dura; un cambio piccolo (la
   * virgola che arriva col nome) si sfoca appena.
   */
  const settled = useRef<string | null>(null);
  const unmask = useRef<number | undefined>(undefined);
  const pulse = useRef<Animation | null>(null);
  useEffect(() => () => window.clearTimeout(unmask.current), []);
  useEffect(() => {
    const previous = settled.current;
    // Il primo testo vero è quello con cui slot-text monta: non rotola.
    settled.current = phase === "pending" ? null : text;
    if (previous === null || previous === text || reduceRef.current) return;

    const length = Math.max(previous.length, text.length);
    let changed = 0;
    for (let index = 0; index < length; index++) {
      if (previous[index] !== text[index]) changed++;
    }
    const rollMs =
      Math.max(0, changed - 1) * ROLL.stagger + ROLL.duration + ROLL.exitOffset;
    const peak = Math.min(4, 1 + changed * 0.25);

    // Web Animations API e non Motion: parte nello stesso istante delle
    // lettere. Motion qui avviava la sfocatura fino a un secondo dopo, a
    // rotolamento quasi finito. Si rotola sempre a entrata conclusa, quindi
    // si parte da nitido e pieno; finita, restano gli stili che l'entrata ha
    // lasciato sul nodo.
    const node = scope.current;
    pulse.current?.cancel();
    pulse.current = node.animate(
      [
        { filter: "blur(0px)", opacity: 1, easing: PULSE_RISE },
        {
          filter: `blur(${peak}px)`,
          opacity: 0.86,
          offset: 0.3,
          easing: PULSE_FALL,
        },
        { filter: "blur(0px)", opacity: 1 },
      ],
      { duration: rollMs * 0.85 },
    );

    // I bordi sfumati dei rulli, solo finché rotolano. Sul nodo e non nello
    // stato: un attributo che va e viene non deve ridisegnare il titolo.
    node.dataset.rolling = "";
    window.clearTimeout(unmask.current);
    unmask.current = window.setTimeout(() => {
      delete node.dataset.rolling;
    }, rollMs + 120);
  }, [text, phase, scope]);

  return (
    <>
      {/* Per chi legge con lo screen reader la pagina si chiama sempre così. */}
      <span className="sr-only">{TITLE}</span>
      <span
        ref={scope}
        aria-hidden
        className="inline-block"
        // Lo stato di partenza del saluto: invisibile, sfocato, un filo più
        // in basso. Lo scrive il server, e il browser lo porta a fuoco; con
        // meno movimento lo raddrizza subito e lo fa solo comparire.
        style={{
          opacity: 0,
          filter: "blur(10px)",
          transform: "translateY(0.3em)",
        }}
      >
        {phase === "pending" ? (
          TITLE
        ) : (
          // Montato con il primo testo vero: rotola solo da lì in poi.
          <SlotText text={text} options={reduce ? NO_ROLL : ROLL} />
        )}
      </span>
    </>
  );
}

/**
 * La data di oggi sotto il titolo, scritta nel browser: lo scheletro
 * dell'agenda (app/(staff)/loading.tsx) può essere preparato alla build, e
 * una data scritta lì resterebbe quella del giorno del rilascio.
 */
export function TodayLabel() {
  const [label] = useState(() => fullDayLabel(dayKey(Date.now())));
  return <span suppressHydrationWarning>{label}</span>;
}
