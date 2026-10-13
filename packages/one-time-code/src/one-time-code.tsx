"use client";

/*
 * One-time code — da Bencho (bencho.dev), licenza MIT: bencho.dev/licence.
 *
 * Rispetto all'originale cambia solo quello che serve a usarlo davvero:
 *
 * - Alfanumerico. L'originale accetta solo cifre; qui `charset` sceglie fra
 *   "numeric" e "alphanumeric" (il default). Le lettere restano come sono
 *   state scritte: un codice può distinguere maiuscole e minuscole, e non sta
 *   al campo deciderlo.
 * - La risposta è di chi verifica. Al posto della manopola Accept/Reject c'è
 *   `onComplete`: riceve il codice completo e torna `true` (le caselle si
 *   fondono in «Verificato») oppure `false` (la scossa, e si riscrive). Finché
 *   la promessa non torna le caselle «respirano». `onVerified` arriva dopo,
 *   a capsula vista: lì va il redirect, che altrimenti la coprirebbe.
 * - Lunghezza libera (non solo 4 o 6): oltre lo spazio disponibile la riga
 *   si rimpicciolisce da sola. Testi in italiano.
 * - La capsula non si riapre al tocco: dopo un codice giusto qui si va avanti,
 *   e tornare a caselle vuote con la sessione già aperta confonderebbe.
 * - Stili in un CSS module accanto al componente: niente globali, niente
 *   classi che possano scontrarsi con quelle delle app.
 *
 * I commenti in inglese sono quelli originali, tenuti apposta: spiegano il
 * perché dei numeri.
 */

import { Check } from "lucide-react";
import { type CSSProperties, useEffect, useId, useRef, useState } from "react";

import styles from "./one-time-code.module.css";

/* ══ One-time code ════════════════════════════════════════
   Six small cells and a caret. Digits rise into their cells;
   a right code draws the cells together until they fuse into
   one capsule that says so, and a wrong one sends a shiver
   down the row and drains the digits out.

   ── SIX CELLS, ONE FIELD ────────────────────────────────
   The same call the sign-in sheet makes, for the same reasons:
   six real inputs break paste, autofill from the notification,
   backspace and screen readers. So there is one invisible
   input over the row and the cells are drawn underneath it.

   ── THE MERGE IS THE GOO'S ──────────────────────────────
   The cells sit under a blur-and-threshold filter, far enough
   apart that it never bridges them. Verifying slides them to
   the middle while a capsule grows out of the same point: as
   they close, the filter joins them, and what is left is one
   shape. Nobody draws the in-between — it is the filter
   deciding when two things are close enough to be one. */

/* ── inlined from lab/motionkit ──────────────────────── */
/* ══ liquid ═══════════════════════════════════════════════
   ── why the filter is a hook ────────────────────────────
   The filter is embedded in each component's own return, but
   its id CANNOT be a literal. Duplicate SVG ids do not scope,
   they collide: the second instance silently steals the first
   one's filter. useId() gives each mount its own name.

   ── what the goo can and cannot do ──────────────────────
   This is feGaussianBlur + feColorMatrix, not a shader. The
   matrix multiplies alpha by `cut` and subtracts half of it,
   so alpha below 0.5 lands on zero and everything above 0.536
   is fully opaque. That hard edge is what fuses nearby shapes
   into one blob — and it is also why this must never touch
   text: glyph antialiasing lives entirely below 0.5, so type
   under this filter loses its edges and then itself. */

function useGoo(blur = 7, cut = 28) {
  /* useId yields ":r0:" — legal in an id attribute but not in
     a url(#…) reference, so strip the colons. React 19 uses
     «» instead, which url() does not like either. */
  const id = `goo-${useId().replace(/[:«»]/g, "")}`;
  const goo = (
    <svg className={styles.defs} aria-hidden="true" focusable="false">
      <defs>
        <filter
          id={id}
          x="-50%"
          y="-50%"
          width="200%"
          height="200%"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur
            in="SourceGraphic"
            stdDeviation={blur}
            result="smear"
          />
          <feColorMatrix
            in="smear"
            type="matrix"
            values={`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${cut} ${-(cut / 2)}`}
          />
        </filter>
      </defs>
    </svg>
  );
  return { id, url: `url(#${id})`, goo };
}

/* ── inlined from lab/spring ──────────────────────── */
/* ── one spring, for everything that settles ───────────────
   Frames, not milliseconds. `dt` is expressed in sixtieths of
   a second and the damping is RAISED to it rather than
   multiplied by it, so a dropped frame decays the same amount
   of energy as the two frames it replaced. Multiplying is the
   version that makes a spring behave differently on a busy
   page, which is the hardest kind of bug to see.

   The loop parks itself the moment the value has settled. */

/* Read once. A preference, not a live input. */
const stillness = () =>
  typeof window !== "undefined" &&
  !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/* how long a cell takes to swell and settle when a digit lands */
const POP_MS = 260;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const smooth = (a: number, b: number, v: number) => {
  const u = clamp((v - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};

/* a cell, and the air between two. Le caselle erano 36 su 44, strette e
   alte: a 40 sono quasi quadrate, e un carattere largo come una W ci sta
   senza toccare i bordi. */
const W = 40;
const H = 44;
const G = 7;
/* the capsule a right code becomes */
const CAP = 128;
/* ── the merge is a SPRING, not a tween ─────────────────
   It was a 560ms ease-in-out, which arrived and stopped. A
   spring a little under critical lets the capsule run past its
   size and come back — stretching long and thin on the way out
   and settling round — which is what makes the fuse read as
   liquid rather than as boxes sliding. Per frame at 60Hz, from
   a stiffness and a damping ratio. */
const MERGE = (() => {
  const k = 0.075;
  const zeta = 0.42;
  return { k, d: 1 - 2 * zeta * Math.sqrt(k) };
})();
const SHAKE_MS = 620;
/* Il «sto controllando» dura almeno questo, anche se la risposta arriva
   prima: senza, un controllo istantaneo salterebbe il respiro delle caselle
   e la fusione partirebbe da ferma. È il ritardo che l'originale simulava. */
const CHECK_MIN_MS = 420;
/* Quanto resta in scena la capsula prima di `onVerified`: la molla della
   fusione si assesta in circa 600ms e «Verificato» compare nell'ultimo
   tratto, così resta il tempo di leggerlo. Con meno movimento la fusione non
   c'è, ma la scritta merita comunque un attimo. */
const VERIFIED_HOLD_MS = 1100;
const VERIFIED_HOLD_STILL_MS = 500;

/** Quali caratteri entrano nel campo. Tutto il resto viene scartato. */
const ALLOWED = {
  numeric: /[^0-9]/g,
  alphanumeric: /[^0-9a-z]/gi,
} as const;

export type OneTimeCodeCharset = keyof typeof ALLOWED;

type Phase = "type" | "check" | "ok" | "no";

export type OneTimeCodeProps = {
  /**
   * Quanti caratteri, quanti se ne vuole: se la riga non sta nel contenitore
   * si rimpicciolisce da sola.
   */
  length?: number;
  /** "alphanumeric" (default) accetta cifre e lettere, "numeric" solo cifre. */
  charset?: OneTimeCodeCharset;
  /**
   * Chiamata a riga piena. `true` fonde le caselle in «Verificato», `false`
   * (o un errore) le scuote e le svuota per riprovare. L'eventuale messaggio
   * d'errore lo mostra chi usa il campo.
   */
  onComplete: (code: string) => boolean | Promise<boolean>;
  /**
   * Dopo un codice giusto, quando la capsula «Verificato» si è vista. È qui
   * che va quello che porta via il campo (aprire la sessione, cambiare
   * pagina): fatto in `onComplete` taglierebbe l'animazione sul nascere.
   */
  onVerified?: () => void;
  /** Ogni cambiamento del codice, svuotamento dopo un errore compreso. */
  onChange?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** the cells' corner, px; the capsule wears the same one */
  corner?: number;
  /** Nome accessibile del campo. */
  label?: string;
  id?: string;
  className?: string;
  style?: CSSProperties;
};

export function OneTimeCode({
  length = 6,
  charset = "alphanumeric",
  onComplete,
  onVerified,
  onChange,
  disabled = false,
  autoFocus = false,
  corner = 12,
  label,
  id,
  className,
  style,
}: OneTimeCodeProps) {
  const n = Math.max(1, Math.round(length));
  const r = clamp(corner, 0, H / 2);
  const rowW = n * W + (n - 1) * G;
  const still = stillness();

  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<Phase>("type");
  const [focus, setFocus] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);
  const root = useRef<HTMLDivElement | null>(null);
  /* Quanto rimpicciolire la riga perché stia nel suo contenitore: con sei
     caselle non serve mai, con dieci su un telefono sì. Tutte le misure qui
     sotto restano in px "di progetto" e lo `zoom` le scala insieme, filtro
     compreso, così le proporzioni studiate per la fusione non cambiano. */
  const [fit, setFit] = useState(1);

  /* moving parts, read by the loop */
  const caret = useRef({ x: W / 2, v: 0 });
  /* when each cell last took a digit — for the little swell */
  const popAt = useRef<number[]>([]);
  const merge = useRef({ m: 0, v: 0, to: 0 });
  const shook = useRef(0);
  const timers = useRef<number[]>([]);
  const raf = useRef(0);
  const alive = useRef(true);
  const [, setTick] = useState(0);
  const live = useRef({ code, n });
  live.current = { code, n };
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /* ── the one loop ────────────────────────────────────────
     Runs while something moves and stops itself after, so a
     row nobody is typing into costs nothing. */
  const wake = () => {
    if (raf.current) return;
    let prev = 0;
    const tick = (t: number) => {
      const dt = prev ? clamp((t - prev) / 16.67, 0, 2.5) : 1;
      prev = t;
      let busy = false;
      const { code: c, n: count } = live.current;

      /* the caret, on a spring with a little give */
      const target = Math.min(c.length, count - 1) * (W + G) + W / 2;
      const k = caret.current;
      if (still) {
        k.x = target;
        k.v = 0;
      } else {
        k.v += (target - k.x) * 0.2 * dt;
        k.v *= 0.62 ** dt;
        k.x += k.v * dt;
        if (Math.abs(target - k.x) < 0.05 && Math.abs(k.v) < 0.05) {
          k.x = target;
          k.v = 0;
        } else busy = true;
      }

      /* the merge, sprung */
      const mg = merge.current;
      if (mg.m !== mg.to || mg.v !== 0) {
        if (still) {
          mg.m = mg.to;
          mg.v = 0;
        } else {
          mg.v += (mg.to - mg.m) * MERGE.k * dt;
          mg.v *= MERGE.d ** dt;
          mg.m += mg.v * dt;
          if (Math.abs(mg.to - mg.m) < 0.0008 && Math.abs(mg.v) < 0.0008) {
            mg.m = mg.to;
            mg.v = 0;
          } else busy = true;
        }
      }

      /* checking breathes for as long as the answer takes */
      if (phaseRef.current === "check" && !still) busy = true;
      if (t - shook.current < SHAKE_MS + 200) busy = true;

      setTick((x) => x + 1);
      /* a cell still swelling from a digit keeps the loop alive */
      if (popAt.current.some((at) => t - at < POP_MS)) busy = true;
      raf.current = busy ? requestAnimationFrame(tick) : 0;
    };
    raf.current = requestAnimationFrame(tick);
  };
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      timers.current.forEach(window.clearTimeout);
      timers.current = [];
    };
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `wake` legge tutto dai ref; qui conta solo *quando* svegliare il loop.
  useEffect(() => {
    wake();
  }, [code, n, phase]);

  const fuse = (to: 0 | 1) => {
    merge.current = { ...merge.current, to };
    wake();
  };

  useEffect(() => {
    const host = root.current?.parentElement;
    if (!host || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const css = getComputedStyle(host);
      const room =
        host.clientWidth -
        Number.parseFloat(css.paddingLeft) -
        Number.parseFloat(css.paddingRight);
      setFit(room > 0 ? Math.min(1, room / rowW) : 1);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(host);
    return () => observer.disconnect();
  }, [rowW]);

  /* a length changing under a row starts it over */
  // biome-ignore lint/correctness/useExhaustiveDependencies: `n` è il segnale, non un valore letto dentro.
  useEffect(() => {
    setCode("");
    setPhase("type");
    merge.current = { m: 0, v: 0, to: 0 };
  }, [n]);

  const update = (next: string) => {
    setCode(next);
    onChange?.(next);
  };

  /* full: a beat of checking, then the answer */
  const settle = async (full: string) => {
    setPhase("check");

    let ok = false;
    try {
      const [answer] = await Promise.all([
        onComplete(full),
        new Promise<void>((done) => later(done, still ? 0 : CHECK_MIN_MS)),
      ]);
      ok = answer === true;
    } catch {
      ok = false;
    }
    if (!alive.current) return;

    if (ok) {
      setPhase("ok");
      fuse(1);
      input.current?.blur();
      later(
        () => onVerified?.(),
        still ? VERIFIED_HOLD_STILL_MS : VERIFIED_HOLD_MS,
      );
      return;
    }

    setPhase("no");
    shook.current = performance.now();
    wake();
    later(
      () => {
        update("");
        setPhase("type");
        input.current?.focus();
      },
      still ? 0 : SHAKE_MS + n * 45 + 160,
    );
  };

  const onInput = (raw: string) => {
    if (phase !== "type" || disabled) return;
    const next = raw.replace(ALLOWED[charset], "").slice(0, n);
    /* each new digit swells its cell — a paste runs along the row */
    if (!still && next.length > code.length) {
      const t0 = performance.now();
      for (let i = code.length; i < next.length; i++)
        popAt.current[i] = t0 + (i - code.length) * 45;
      wake();
    }
    update(next);
    if (next.length === n) void settle(next);
  };

  /* ── where everything is this frame ──────────────────────── */
  const now = performance.now();
  /* the raw spring runs past 0 and 1; the cells' travel is
     clamped to it, and only the capsule is allowed to take the
     overshoot, as a stretch */
  const raw = merge.current.m;
  const m = clamp(raw, 0, 1);
  const home = (i: number) => i * (W + G);
  const mid = (rowW - W) / 2;
  const since = now - shook.current;
  const shaking = phase === "no" && since < SHAKE_MS && !still;
  const shake = (i: number) =>
    shaking
      ? 5 *
        Math.exp(-since / 190) *
        Math.sin((since / 1000) * Math.PI * 2 * 10 + i * 0.55)
      : 0;
  const cellX = (i: number) => mix(home(i), mid, m) + shake(i);
  /* ── a digit arriving ─────────────────────────────────────
     The cell that takes it swells a touch and settles: up and
     back on one half-sine, four per cent at the top. Small on
     purpose — it is an acknowledgement, not an event. */
  const pop = (i: number) => {
    const at = popAt.current[i];
    if (at === undefined) return 1;
    const u = (now - at) / POP_MS;
    return u > 0 && u < 1 ? 1 + 0.04 * Math.sin(Math.PI * u) : 1;
  };
  /* checking: a soft wave of breath through the cells */
  const breath = (i: number) => {
    if (phase !== "check" || still) return pop(i);
    const u = ((now % 900) / 900) * (n + 2) - i;
    return 1 - 0.07 * (u > 0 && u < 2 ? Math.sin((u / 2) * Math.PI) : 0);
  };
  const over = raw - 1;
  /* long and thin past its size, round again as it settles:
     width and height trade, so it reads as one soft thing */
  const capW = CAP * smooth(0.3, 1, m) * (1 + Math.max(-0.12, over) * 0.9);
  const capSy = 1 - Math.max(-0.12, over) * 0.55;
  /* cells round off into the capsule's pill as they close in,
     so the two shapes agree by the time the goo joins them */
  const cellR = mix(r, H / 2, smooth(0.15, 0.7, m));
  const typing = phase === "type" && focus;

  const { url, goo } = useGoo(3, 24);

  const name =
    label ?? `Codice di ${n} ${charset === "numeric" ? "cifre" : "caratteri"}`;

  return (
    <div
      ref={root}
      className={className ? `${styles.root} ${className}` : styles.root}
      style={style}
      data-phase={phase}
      data-disabled={disabled || undefined}
    >
      <div
        className={styles.row}
        style={{ width: rowW, height: H, zoom: fit < 1 ? fit : undefined }}
      >
        {/* the cells and the capsule: one colour, under the filter */}
        <div
          className={styles.goo}
          aria-hidden="true"
          style={{ filter: still ? undefined : url }}
        >
          {Array.from({ length: n }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: le caselle sono posizioni fisse, l'indice è la loro identità.
              key={i}
              className={styles.cell}
              style={{
                width: W,
                borderRadius: cellR,
                transform: `translateX(${cellX(i).toFixed(2)}px) scale(${breath(i).toFixed(3)})`,
              }}
            />
          ))}
          {capW > 0.5 && (
            <span
              className={styles.cell}
              /* always a full pill — the capsule is a result, not
                 a cell, and wears the rounded shape whatever the
                 corner says the cells are */
              style={{
                width: capW,
                borderRadius: H / 2,
                transform: `translateX(${((rowW - capW) / 2).toFixed(2)}px) scaleY(${capSy.toFixed(3)})`,
              }}
            />
          )}
        </div>

        {/* the digits — an empty cell is just the cell */}
        {Array.from({ length: n }, (_, i) => {
          const d = code[i];
          const x = cellX(i);
          /* a wrong code drains right to left */
          const out =
            phase === "no" && !still
              ? smooth(0, 1, (since - 300 - (n - 1 - i) * 45) / 220)
              : 0;
          return (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: come sopra, una per casella.
              key={i}
              className={styles.slot}
              style={{
                width: W,
                transform: `translateX(${x.toFixed(2)}px)`,
                opacity: 1 - smooth(0, 0.45, m),
              }}
            >
              {d && (
                <span
                  key={`${i}-${d}`}
                  className={styles.digit}
                  style={{
                    translate: `0 ${(out * 8).toFixed(2)}px`,
                    opacity: 1 - out,
                  }}
                >
                  {d}
                </span>
              )}
            </span>
          );
        })}

        {/* the caret, stretched by its own speed */}
        <i
          className={styles.caret}
          /* not until the cells have come apart again, or it
             stands in an empty slot the capsule is still on */
          data-on={typing && code.length < n && m < 0.08}
          style={{
            transform: `translateX(${(caret.current.x - 1).toFixed(2)}px) scaleX(${(1 + Math.min(5, Math.abs(caret.current.v) * 0.9)).toFixed(3)})`,
          }}
        />

        {/* what the capsule says */}
        <span
          className={styles.ok}
          aria-hidden={phase !== "ok"}
          style={{
            opacity: smooth(0.72, 1, m),
            scale: `${mix(0.92, 1, smooth(0.72, 1, m))}`,
          }}
        >
          <Check size={14} strokeWidth={2.4} aria-hidden="true" />
          Verificato
        </span>

        <input
          ref={input}
          id={id}
          className={styles.field}
          value={code}
          onChange={(e) => onInput(e.target.value)}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          readOnly={phase !== "type"}
          disabled={disabled}
          // biome-ignore lint/a11y/noAutofocus: si arriva qui per scrivere il codice, e basta.
          autoFocus={autoFocus}
          inputMode={charset === "numeric" ? "numeric" : "text"}
          autoComplete="one-time-code"
          autoCapitalize="off"
          autoCorrect="off"
          maxLength={n}
          aria-label={phase === "ok" ? "Codice verificato" : name}
          aria-busy={phase === "check"}
          aria-invalid={phase === "no" || undefined}
          spellCheck={false}
        />
      </div>
      {goo}
    </div>
  );
}
