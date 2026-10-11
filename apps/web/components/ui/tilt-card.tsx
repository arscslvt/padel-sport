"use client";

/*
 * TiltCard, dal componente «Tilt card» di Bencho (MIT, bencho.dev/licence).
 *
 * Adattato in tre punti, e solo lì:
 * - al posto dell'immagine (BUTTERFLY, che non viaggia con la licenza) la
 *   card ospita dei `children`: qui è la tessera punti dell'area personale;
 * - le misure non sono più fisse (W/H): il riquadro le prende dal `className`
 *   di chi lo usa, così la tessera segue la larghezza della colonna;
 * - `intro` fa scorrere una volta il «dito» sulla card, per dire che si può
 *   toccare (vedi più sotto).
 * I commenti originali restano: spiegano perché i numeri sono quelli.
 */

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/* ── inlined from lab/spring ──────────────────────── */
/* ── one spring, for everything that settles ───────────────
   The maths was already on this bench twice, copied by hand:
   Humidity's wheel and Brightness's column both accumulate
   velocity toward a target, damp it, and snap when both the
   delta and the velocity fall under 0.02. Two copies is a
   coincidence; five would be a policy, so it comes out here
   before the elastic blocks are written against it.

   The two shipped copies are deliberately NOT refactored onto
   this. They work, they are tuned, and rewriting the innards
   of two live components to prove a point about duplication
   is how a good afternoon becomes a bad one. This is the one
   new code uses.

   Frames, not milliseconds. `dt` is expressed in sixtieths of
   a second and the damping is RAISED to it rather than
   multiplied by it, so a dropped frame decays the same amount
   of energy as the two frames it replaced. Multiplying is the
   version that makes a spring behave differently on a busy
   page, which is the hardest kind of bug to see.

   The loop parks itself the moment the value has settled.
   CLAUDE.md is not complimentary about the one permanent
   requestAnimationFrame already on this bench and there is no
   case for five more. */

/* 0..100 into the two numbers a spring actually has.

   50 is what Humidity and Brightness were tuned at, which is
   the rule every elastic knob on this bench follows — see
   lab/motion. Turn the panel to the middle and nothing has
   changed.

   Both ends have to be usable, which is what fixes the range:
   at 0 it is slow and heavy and still arrives, at 100 it is
   quick with a visible overshoot, and nowhere in between does
   it ring for longer than it takes to read. */
/* The pair is chosen by DAMPING RATIO and then written back
   as stiffness and decay, because the ratio is the thing a
   person is actually setting and the two numbers on their own
   do not say what they add up to.

     zeta = -ln(d) / (2 * sqrt(k))

   The first version of this ran 0.06..0.26 stiffness against
   0.93..0.74 decay, which reads as a sensible spread and is
   not one: it puts zeta between 0.15 and 0.16 across the
   WHOLE range, so every setting overshot by about sixty per
   cent and the knob only changed how fast it did it. Pull's
   return went 130px past its own resting position and lifted
   the content off the top of the card.

     0   → zeta ~0.85, heavy, arrives without a ring
     50  → zeta ~0.41, near where Humidity and Brightness sit
     100 → zeta ~0.20, lively, two visible rebounds

   Both ends shippable, which is the constraint that fixed the
   numbers rather than taste. */
const springOf = (tune: number) => ({
  /* stiffness: how hard it is pulled toward the target */
  k: 0.08 + (tune / 100) * 0.16,
  /* decay, per frame: how much of the velocity survives */
  d: 0.62 + (tune / 100) * 0.2,
});

/* Units matter. The snap threshold is absolute, so a caller
   works in pixels or in 0..100 — a spring driven over 0..1
   would be "settled" before it had visibly moved. */
function useSpring(target: number, tune = 50, instant = false) {
  const [at, setAt] = useState(target);
  const cur = useRef(target);
  const vel = useRef(0);
  const raf = useRef(0);

  useEffect(() => {
    if (instant) {
      cur.current = target;
      vel.current = 0;
      setAt(target);
      return;
    }
    const { k, d } = springOf(tune);
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      vel.current += (target - cur.current) * k * dt;
      vel.current *= d ** dt;
      cur.current += vel.current * dt;
      if (
        Math.abs(target - cur.current) < 0.02 &&
        Math.abs(vel.current) < 0.02
      ) {
        cur.current = target;
        vel.current = 0;
        setAt(target);
        raf.current = 0;
        return;
      }
      setAt(cur.current);
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
    };
    /* `tune` sits here beside `target` for the reason
       Brightness spells out: the loop closes over it, so
       without it a knob turned mid-flight would do nothing
       until something else restarted the effect. Restarting
       picks up from the refs, so it continues rather than
       snapping. */
  }, [target, tune, instant]);

  return at;
}

/* Read once, the way the wheel and the pill nav do. A
   preference, not a live input. */
const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* ══ Tilt ═════════════════════════════════════════════════
   A picture card that gives under the pointer.

   IT SINKS, IT DOES NOT LIFT. Every tilt card on the internet
   rotates TOWARD the cursor: the corner you are nearest rises
   to meet you and the card reads as a slab of glass catching
   the light. This one does the opposite — the point you are
   over goes AWAY, and the far side comes up. The difference
   is one minus sign and it is the whole component: a surface
   that rises to your finger is being displayed to you, and a
   surface that gives under it is being touched.

   Which means the sign is not a detail to get right by
   fiddling. Cursor at the top → the top edge has to go back,
   which is a POSITIVE rotateX; cursor at the right → the
   right edge goes back, which is a positive rotateY. Hence
   `rx = -ny` and `ry = +nx`, the negation of the usual pair.

   THE ROTATION ALONE IS NOT ENOUGH. A rotation about the
   centre is symmetric — the near side down, the far side up
   by the same amount — and on its own it reads as a card
   pivoting, not as one being pressed. What makes it a press
   is that the darkest point tracks the pointer: a depression
   catches shadow at its deepest, and the rim opposite catches
   light. Those two gradients are doing at least as much of
   the work as the transform is, and neither would convince on
   its own.

   ONE PAIR OF NUMBERS IS THE STATE. Two springs hold where
   the pointer is, normalised to -1..1, and the rotation, both
   gradients and the shadow are all read off them. Nothing
   here has a transition of its own — see the note on Sound
   for why that matters, which is the same reason. */

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/* ── how deep the room is ──────────────────────────────────
   The one number that decides whether this reads as a card
   turning or as a poster being sheared. Perspective is the
   distance from the viewer to the screen, so a small number
   is a face close to the glass: the near corner grows, the
   far corner shrinks, and ten degrees looks like thirty.

   800 against a 320px card is about two and a half card
   heights back — far enough that the foreshortening is a
   suggestion rather than a fisheye, close enough that the
   corners are visibly different sizes. It is not a knob
   because it is not a separate idea from the tilt: both
   answer "how 3D", and two sliders for one feeling is how a
   panel stops meaning anything. */
const DEPTH = 800;

/* how far the whole card retreats while it is being touched.
   Small on purpose — this is the difference between a card
   that tips and a card that is pushed, and at anything past
   about twenty it stops being a press and becomes a zoom. */
const SINK = 14;

const CORNER = 20;
const TILT = 10;
const SHADE = 60;

/* ── il gesto d'ingresso ─────────────────────────────────
   Una card che si piega solo sotto il dito non lo dice a
   nessuno: chi non ci passa sopra non lo scoprirà mai. Con
   `intro` la card fa un solo gesto appena arrivata: si
   inclina di poco su un fianco e torna dritta.

   ORIZZONTALE E BASTA. Le versioni precedenti facevano
   attraversare la card da un «dito» in diagonale, con
   affondo e riflesso pieni: era una dimostrazione, e si
   leggeva come un meccanismo. Qui l'asse è uno solo, il
   bersaglio sale e scende su mezza sinusoide (parte e
   arriva fermo), e la molla lo insegue: un'oscillazione di
   pochi gradi, che si nota senza farsi guardare.

   POCO AFFONDO, POCA LUCE. Il riflesso e l'ombra sono la
   parte che dice «premuto»: durante il gesto ne resta un
   terzo, quanto basta perché la luce scivoli sul bordo. */
const INTRO = {
  /** parte mentre la card finisce di posarsi */
  delay: 280,
  /** quanto dura l'oscillazione */
  sweep: 650,
  /** quanto resta morbida la molla dopo, per il ritorno */
  settle: 600,
  tune: 35,
  /** quanto si sposta il «dito» verso il bordo, -1..1 */
  sway: 0.4,
  /** quota dell'inclinazione massima */
  reach: 0.6,
  /** quota di affondo, ombra e riflesso */
  lit: 0.35,
} as const;

/* in e out come una sinusoide: parte e arriva a velocità zero */
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export function TiltCard({
  /* the most either axis turns, in degrees */
  tilt = TILT,
  corner = CORNER,
  /* how dark the dent gets, 0..100 */
  shade = SHADE,
  intro = false,
  className,
  cardClassName,
  children,
}: {
  tilt?: number;
  corner?: number;
  shade?: number;
  /** Fa scorrere una volta il «dito» sulla card al montaggio. */
  intro?: boolean;
  /** Misure del riquadro: è lui a decidere larghezza e proporzioni. */
  className?: string;
  /** Classi della faccia della card, quella che si inclina. */
  cardClassName?: string;
  children?: React.ReactNode;
}) {
  const skin = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState({ x: 0, y: 0 });
  const [on, setOn] = useState(false);
  const [still] = useState(stillness);
  const [soft, setSoft] = useState(false);
  /* il dito vero vince sempre: toccare la card a metà
     passaggio lo interrompe invece di tirarle contro */
  const stopIntro = useRef<() => void>(() => {});

  useEffect(() => {
    if (!intro || still) return;

    let raf = 0;
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = easeInOutSine(clamp((t - start) / INTRO.sweep, 0, 1));
      /* solo in orizzontale: verso destra e di nuovo al
         centro, su mezza sinusoide */
      setAt({ x: INTRO.sway * Math.sin(Math.PI * p), y: 0 });
      if (p < 1) {
        raf = requestAnimationFrame(step);
        return;
      }
      setOn(false);
      raf = 0;
    };

    const begin = window.setTimeout(() => {
      setSoft(true);
      setOn(true);
      raf = requestAnimationFrame(step);
    }, INTRO.delay);
    const end = window.setTimeout(
      () => setSoft(false),
      INTRO.delay + INTRO.sweep + INTRO.settle,
    );

    const stop = () => {
      window.clearTimeout(begin);
      window.clearTimeout(end);
      cancelAnimationFrame(raf);
    };
    stopIntro.current = () => {
      stop();
      setSoft(false);
      stopIntro.current = () => {};
    };
    return stop;
  }, [intro, still]);

  const tune = soft ? INTRO.tune : 50;

  /* ── the state, and there is only this ───────────────────
     Where the pointer is, as -1..1 on each axis, sprung. The
     spring is on the POSITION rather than on the rotation, so
     the gradients and the transform can never disagree about
     where the finger is — they are three readings of one
     number instead of three things being animated towards
     the same place.

     Sprung rather than tracked one-to-one because a card with
     no weight follows the cursor exactly and reads as a
     texture pinned to the mouse. The lag is what gives it
     mass, and the settle on the way out is the only reason
     leaving the card feels like anything at all. */
  const sx = useSpring(on ? at.x : 0, tune, still);
  const sy = useSpring(on ? at.y : 0, tune, still);
  /* one more for how much of any of this applies, so the
     shadow and the sheen fade rather than cutting */
  const lit = useSpring(on ? (soft ? INTRO.lit : 1) : 0, tune, still);

  const max = clamp(tilt, 0, 20) * (soft ? INTRO.reach : 1);
  const rx = -sy * max;
  const ry = sx * max;

  /* the pointer in the card's own terms, as a PERCENTAGE —
     the wall and the overlay both draw this block at their
     own scale, and a gradient placed in pixels would land
     somewhere else in each of them */
  const px = ((sx + 1) / 2) * 100;
  const py = ((sy + 1) / 2) * 100;

  const dark = (clamp(shade, 0, 100) / 100) * 0.55 * lit;
  const rim = (clamp(shade, 0, 100) / 100) * 0.34 * lit;

  const track = (e: React.PointerEvent) => {
    const el = skin.current;
    if (!el) return;
    stopIntro.current();
    /* measured from the FRAME, which never moves. Reading the
       card instead would be asking a rotating object where it
       is, and near the edges it has already turned away from
       the pointer that is asking. */
    const r = el.getBoundingClientRect();
    setAt({
      x: clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1),
      y: clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1),
    });
    setOn(true);
  };

  return (
    <div
      className={cn("tlt", className)}
      ref={skin}
      style={{ perspective: DEPTH }}
      /* pointer, not mouse: the same handler carries a finger
         dragged across the card, so a phone gets the effect
         while it is being touched rather than getting nothing
         at all. */
      onPointerMove={track}
      /* ── `out` with a containment test, NOT `leave` ───────
         Which is what leave IS — the browser derives it from
         exactly this event by asking whether the thing you
         moved to is inside the thing you were on — so this is
         not a second mechanism, it is the same one written
         out. What it buys is the case React would not
         synthesise: the rehearsal drives a scripted pointer by
         dispatching `pointerout`, and its final beat walks off
         the card carrying `relatedTarget: null`. Measured, no
         `onPointerLeave` came of it, and every card on the
         wall finished its demo still sunk under a cursor that
         had gone.

         Null counts as outside, which is also the honest
         answer for a real pointer leaving the window. */
      onPointerOut={(e) => {
        const el = skin.current;
        const to = e.relatedTarget as Node | null;
        if (!el || !to || !el.contains(to)) setOn(false);
      }}
      /* a touch taken over by a scroll never reports leaving */
      onPointerCancel={() => setOn(false)}
    >
      <div
        className={cn("tlt-card", cardClassName)}
        style={{
          borderRadius: clamp(corner, 0, 40),
          /* translateZ FIRST, so the retreat is measured in
             the room's axes rather than in the card's own —
             after a rotation, the card's z points somewhere
             off to the side and "back" stops meaning back. */
          transform: `translateZ(${-SINK * lit}px) rotateX(${rx}deg) rotateY(${ry}deg)`,
          /* ── the shadow TIGHTENS ────────────────────────
             A thing pressed into a surface has less air under
             it, so the gap closes and the shadow draws in.
             Growing it on hover is the reflex — it is what a
             card that LIFTS would do — and it fights every
             other cue here. */
          boxShadow: `0 ${mix(20, 9, lit)}px ${mix(44, 24, lit)}px -8px rgba(15, 23, 42, ${mix(
            0.22,
            0.15,
            lit,
          )})`,
        }}
      >
        {children}
        {/* ── the dent, and the rim opposite it ───────────
            The shadow pools where the surface is deepest,
            which is under the pointer, and the light catches
            the far edge that has risen — so the two are
            placed at mirrored points and neither is centred
            on anything. This is the layer that makes the
            transform read as a press. */}
        <span
          className="tlt-sheen"
          aria-hidden="true"
          style={{
            backgroundImage: `radial-gradient(42% 34% at ${px}% ${py}%, rgba(9, 14, 28, ${dark}) 0%, rgba(9, 14, 28, 0) 100%), radial-gradient(52% 42% at ${
              100 - px
            }% ${100 - py}%, rgba(255, 255, 255, ${rim}) 0%, rgba(255, 255, 255, 0) 100%)`,
          }}
        />
      </div>
    </div>
  );
}
