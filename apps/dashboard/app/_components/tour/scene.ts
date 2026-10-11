/**
 * La geometria del tour: dove sta la dashboard rimpicciolita, dove la
 * cornice, dove il riquadro acceso.
 *
 * Il tour non fotografa la pagina: rimpicciolisce quella vera, come una
 * telecamera che arretra e poi si avvicina a una parte. Una «scena» è una
 * posa della telecamera più la cornice e il riquadro acceso, tutto in
 * coordinate dello schermo; passare da uno step all'altro è interpolare fra
 * due scene, numero per numero, così cornice, zoom e riquadro si muovono
 * insieme e si possono interrompere a metà da dove sono.
 *
 * Le coordinate «locali» sono quelle della dashboard a grandezza naturale,
 * prima della trasformazione: un punto locale `p` finisce sullo schermo in
 * `t + s·p`.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Scene {
  /** Lo spazio della dashboard a grandezza naturale (la viewport). */
  W: number;
  H: number;
  /** La telecamera: scala e spostamento della dashboard. */
  s: number;
  tx: number;
  ty: number;
  /** La cornice sullo schermo, e il raggio dei suoi angoli. */
  fx: number;
  fy: number;
  fw: number;
  fh: number;
  r: number;
  /** Il riquadro acceso sullo schermo; senza riquadro coincide con la cornice. */
  hx: number;
  hy: number;
  hw: number;
  hh: number;
  hr: number;
  /** Quanto è scuro il resto della cornice: 0 niente, 1 del tutto. */
  dim: number;
}

/** La dashboard com'è senza tour: a tutto schermo, angoli vivi, niente velo. */
export function identityScene(W: number, H: number): Scene {
  return {
    W,
    H,
    s: 1,
    tx: 0,
    ty: 0,
    fx: 0,
    fy: 0,
    fw: W,
    fh: H,
    r: 0,
    hx: 0,
    hy: 0,
    hw: W,
    hh: H,
    hr: 0,
    dim: 0,
  };
}

export function lerpScene(from: Scene, to: Scene, t: number): Scene {
  const out = { ...to };
  for (const key of Object.keys(to) as (keyof Scene)[]) {
    out[key] = from[key] + (to[key] - from[key]) * t;
  }
  return out;
}

export interface SceneInput {
  W: number;
  H: number;
  /** Lo spazio sullo schermo in cui può stare la cornice. */
  area: Rect;
  /** Cosa indicare, in coordinate locali; senza, si mostra la pagina intera. */
  target: Rect | null;
  /** Raggio degli angoli della cornice, sullo schermo. */
  radius: number;
  /** Oltre questa scala la telecamera non si avvicina. */
  maxScale: number;
  /** Spazio attorno al riquadro che si vuole comunque vedere, in locale. */
  context: number;
  /** Margine fra il riquadro acceso e l'elemento, sullo schermo. */
  holePadding: number;
  /** Raggio del riquadro acceso; `"pill"` per gli elementi tondi. */
  holeRadius: number | "pill";
}

export function computeScene(input: SceneInput): Scene {
  const { W, H, area, target, radius, maxScale, context } = input;

  // Senza un riquadro si vede tutta la pagina: la cornice abbraccia la
  // dashboard intera, rimpicciolita quanto basta.
  const focus = target
    ? {
        x: target.x - context,
        y: target.y - context,
        w: target.w + context * 2,
        h: target.h + context * 2,
      }
    : { x: 0, y: 0, w: W, h: H };

  const fit = Math.min(area.w / focus.w, area.h / focus.h);
  const s = target ? Math.min(fit, maxScale) : fit;

  const tx = place(area.x, area.w, s * W, focus.x + focus.w / 2, s);
  const ty = place(area.y, area.h, s * H, focus.y + focus.h / 2, s);

  // La cornice è dove la dashboard e lo spazio disponibile si sovrappongono:
  // a pagina intera ha le proporzioni dello schermo, da vicino lo riempie.
  const frame = intersect(area, { x: tx, y: ty, w: s * W, h: s * H });

  if (!target) {
    return {
      W,
      H,
      s,
      tx,
      ty,
      fx: frame.x,
      fy: frame.y,
      fw: frame.w,
      fh: frame.h,
      r: radius,
      hx: frame.x,
      hy: frame.y,
      hw: frame.w,
      hh: frame.h,
      hr: radius,
      dim: 0,
    };
  }

  const pad = input.holePadding;
  // Il riquadro resta un filo dentro la cornice, perché il bordo acceso non
  // venga tagliato quando l'elemento sta proprio sul bordo (la barra in basso).
  const hole = intersect(
    {
      x: frame.x + 3,
      y: frame.y + 3,
      w: frame.w - 6,
      h: frame.h - 6,
    },
    {
      x: tx + s * target.x - pad,
      y: ty + s * target.y - pad,
      w: s * target.w + pad * 2,
      h: s * target.h + pad * 2,
    },
  );
  const hr =
    input.holeRadius === "pill"
      ? Math.min(hole.w, hole.h) / 2
      : input.holeRadius;

  return {
    W,
    H,
    s,
    tx,
    ty,
    fx: frame.x,
    fy: frame.y,
    fw: frame.w,
    fh: frame.h,
    r: radius,
    hx: hole.x,
    hy: hole.y,
    hw: hole.w,
    hh: hole.h,
    hr,
    dim: 1,
  };
}

/**
 * Lo spostamento su un asse: centrato sul punto da indicare, ma senza mai
 * mostrare il vuoto oltre il bordo della dashboard. Se la dashboard è più
 * piccola dello spazio, sta nel mezzo.
 */
function place(
  start: number,
  size: number,
  content: number,
  center: number,
  s: number,
) {
  if (content <= size) return start + (size - content) / 2;
  const centered = start + size / 2 - s * center;
  return Math.min(start, Math.max(start + size - content, centered));
}

function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.w, b.x + b.w);
  const bottom = Math.min(a.y + a.h, b.y + b.h);
  return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
}

/**
 * Dove sono, in coordinate locali, gli elementi segnati `data-tour="nome"`.
 *
 * Se ce n'è più d'uno visibile — le voci della barra laterale divise in
 * gruppi — vale il rettangolo che li contiene tutti. Quelli nascosti (la
 * barra in basso da desktop, la laterale da telefono) hanno misura zero e
 * non contano. La misura dello schermo si riporta in locale togliendo la
 * telecamera attuale, che è quella appena disegnata.
 */
export function measureTarget(
  root: HTMLElement,
  name: string,
  camera: Pick<Scene, "s" | "tx" | "ty" | "W" | "H">,
): Rect | null {
  const elements = root.querySelectorAll<HTMLElement>(`[data-tour~="${name}"]`);
  let box: Rect | null = null;

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) continue;
    const local = {
      x: (rect.left - camera.tx) / camera.s,
      y: (rect.top - camera.ty) / camera.s,
      w: rect.width / camera.s,
      h: rect.height / camera.s,
    };
    box = box ? union(box, local) : local;
  }

  // Quello che sta fuori dalla pagina visibile non si può indicare.
  return box ? intersect(box, { x: 0, y: 0, w: camera.W, h: camera.H }) : null;
}

function union(a: Rect, b: Rect): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
  };
}

export function sameRect(a: Rect | null, b: Rect | null, tolerance = 1.5) {
  if (!a || !b) return a === b;
  return (
    Math.abs(a.x - b.x) <= tolerance &&
    Math.abs(a.y - b.y) <= tolerance &&
    Math.abs(a.w - b.w) <= tolerance &&
    Math.abs(a.h - b.h) <= tolerance
  );
}
