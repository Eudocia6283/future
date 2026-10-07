import { animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { CoverIntro } from "./intro";
import { useSvgId } from "./svgId";

/**
 * The cover's all-seeing eye, drawn like the Atelier's Portal gates: a few
 * lines interlaced rather than one closed outline.
 *
 *   outer layer · two lids bowing to a tall almond, each carried on past the
 *                 corners so upper and lower cross there in small X's
 *   inner layer · a longer, flatter almond built the same way, so every lid
 *                 of it crosses the outer one
 *   back layer  · the eye's two axes, faint and dashed
 *   iris        · a rune of three circles, back to front, and a gold ring
 *   gold        · a still almond around the eye, traced in as the pointer
 *                 nears, with a small ring at its top
 *   beyond      · a dashed echo, and a ripple drifting out now and then
 *
 * At each crossing, alternating round the eye, one lid passes over the other:
 * the lid beneath is masked by a widened copy of the one above, redrawn with
 * it, so the gap stays on the crossing as the eye blinks. Each lid is split at
 * its middle so that two lids cross at most once. All sizes are in units of
 * `a`, half the outer almond's width, about (0, 0).
 */

type Layer = "outer" | "inner";
type Lid = { layer: Layer; upper: boolean; side: -1 | 1 };
type Pt = [number, number];

// Half-width, bow and how far past its corners (in the curve's own parameter) each almond runs.
const ALMOND: Record<Layer, { w: number; h: number; ext: number }> = {
  outer: { w: 1, h: 0.42, ext: 0.1 },
  inner: { w: 1.2, h: 0.25, ext: 0.07 },
};
// A shut eye's lids meet on a line bowed this much of the open bow, downward.
const SHUT = 0.2;
const GOLD = { w: 1.38, h: 0.62 };
const ECHO = { w: 1.62, h: 0.82 };
const STROKE: Record<Layer, { width: number; className: string; draw: [number, number] }> = {
  outer: { width: 1.4, className: "stroke-ivory", draw: [0, 0.7] },
  inner: { width: 1.1, className: "stroke-jacaranda-light", draw: [0.2, 0.6] },
};
// Clear margin either side of a lid where it passes over another.
const CLEARANCE = 3;
// How far the lids drift apart, away from the eye's axis, as the pointer nears.
const DRIFT: Record<Layer, number> = { outer: 5, inner: 3 };
const SAMPLES = 24;

// Seconds between blinks, drawn at random, and how often a blink comes twice.
const BLINK_GAP = [2.8, 6.5] as const;
const DOUBLE_BLINK = 0.2;
// Screen px: how far off the pointer must be for the eye to look fully aside,
// and how near for it to take notice.
const LOOK_REACH = 420;
const NEAR = 220;

const LIDS: Lid[] = (["inner", "outer"] as Layer[]).flatMap((layer) =>
  [true, false].flatMap((upper) => ([-1, 1] as const).map((side) => ({ layer, upper, side }))),
);

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const pts = (p: Pt[]) => "M" + p.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join("L");
/** A symmetric almond from two quadratic lids, `w` each side and bowing `h` above and below. */
const almond = (w: number, h: number) => `M${-w} 0Q0 ${-2 * h} ${w} 0Q0 ${2 * h} ${-w} 0Z`;

/**
 * One half-lid as points, at openness `o` and drift `d` (0–1). A lid is the
 * parabola through both corners bowing to its middle; carried on past a
 * corner it curls back across the other lid.
 */
function lidPoints({ layer, upper, side }: Lid, a: number, o: number, d: number): Pt[] {
  const { w, h, ext } = ALMOND[layer];
  const bow = lerp(SHUT * h, upper ? -h : h, o) * a;
  const shift = DRIFT[layer] * d;
  const [u0, u1] = side < 0 ? [-ext, 0.5] : [0.5, 1 + ext];
  return Array.from({ length: SAMPLES + 1 }, (_, i) => {
    const u = lerp(u0, u1, i / SAMPLES);
    const x = -w + 2 * w * u;
    // Drifting, the lid moves off the axis and a little out towards its corners;
    // not at all sideways at its middle, so its two halves stay joined.
    return [(x + (x / w) * 0.35 * (shift / a)) * a, 4 * bow * u * (1 - u) + (upper ? -shift : shift)];
  });
}

/** Which lids pass over each lid, alternating crossing by crossing round the eye. */
function weave(a: number) {
  const lines = LIDS.map((lid) => lidPoints(lid, a, 1, 0));
  const crossings: { i: number; j: number; angle: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const hit = cross(lines[i], lines[j]);
      if (hit) crossings.push({ i, j, angle: Math.atan2(hit[1], hit[0]) });
    }
  }
  crossings.sort((p, q) => p.angle - q.angle);
  const over: number[][] = LIDS.map(() => []);
  crossings.forEach(({ i, j }, k) => {
    const [under, above] = k % 2 ? [j, i] : [i, j];
    over[under].push(above);
  });
  return over;
}

/** The first point where two polylines cross, if they do. */
function cross(p: Pt[], q: Pt[]): Pt | null {
  for (let i = 1; i < p.length; i++) {
    for (let j = 1; j < q.length; j++) {
      const [ax, ay] = p[i - 1];
      const [dax, day] = [p[i][0] - ax, p[i][1] - ay];
      const [bx, by] = q[j - 1];
      const [dbx, dby] = [q[j][0] - bx, q[j][1] - by];
      const den = dax * dby - day * dbx;
      if (Math.abs(den) < 1e-9) continue;
      const ta = ((bx - ax) * dby - (by - ay) * dbx) / den;
      const tb = ((bx - ax) * day - (by - ay) * dax) / den;
      if (ta > 0 && ta < 1 && tb > 0 && tb < 1) return [ax + ta * dax, ay + ta * day];
    }
  }
  return null;
}

/** The outer almond's opening, for the white of the eye and the iris's clip. */
function opening(a: number, o: number) {
  const { w, h } = ALMOND.outer;
  const up = lerp(SHUT * h, -h, o) * a * 2;
  const down = lerp(SHUT * h, h, o) * a * 2;
  return `M${-w * a} 0Q0 ${up} ${w * a} 0Q0 ${down} ${-w * a} 0Z`;
}

export function CoverEye({ a, delay = 0, opening: turning }: { a: number; delay?: number; opening: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const id = useSvgId("eye");
  const intro = useContext(CoverIntro);
  const r = a * 0.3;
  const [over] = useState(() => weave(a));

  // How far open the eye is, and how near the pointer; every lid is redrawn from both.
  const open = useMotionValue(reduced ? 1 : 0);
  const near = useSpring(0, { stiffness: 90, damping: 16 });
  const paths = useRef<Record<string, SVGPathElement | null>>({});
  const ref = (key: string) => (el: SVGPathElement | null) => {
    paths.current[key] = el;
  };
  const initial = LIDS.map((lid) => pts(lidPoints(lid, a, open.get(), 0)));
  useEffect(() => {
    const redraw = () => {
      const o = open.get();
      const d = near.get();
      const set = (key: string, v: string) => paths.current[key]?.setAttribute("d", v);
      LIDS.forEach((lid, i) => {
        const v = pts(lidPoints(lid, a, o, d));
        set(`lid${i}`, v);
        set(`halo${i}`, v);
        LIDS.forEach((_, k) => set(`mask${k}-${i}`, v));
      });
      const hole = opening(a, o);
      set("clip", hole);
      set("white", hole);
      paths.current.trace?.style.setProperty("stroke-dashoffset", String(1 - d));
    };
    redraw();
    const offs = [open.on("change", redraw), near.on("change", redraw)];
    return () => offs.forEach((off) => off());
  }, [open, near, a]);

  // It wakes, then blinks at random until the cover is turned, when it shuts.
  useEffect(() => {
    if (reduced) return;
    if (turning) {
      const anim = animate(open, 0, { duration: 0.28, ease: "easeIn" });
      return () => anim.stop();
    }
    let timer: ReturnType<typeof setTimeout>;
    let anim: ReturnType<typeof animate> | undefined;
    const blink = () => {
      const twice = Math.random() < DOUBLE_BLINK;
      anim = animate(open, twice ? [1, 0, 1, 0, 1] : [1, 0, 1], {
        duration: twice ? 0.62 : 0.32,
        times: twice ? [0, 0.2, 0.5, 0.7, 1] : [0, 0.38, 1],
        ease: "easeInOut",
      });
      timer = setTimeout(blink, (lerp(...BLINK_GAP, Math.random()) + (twice ? 0.6 : 0.3)) * 1000);
    };
    // Drawn in, it wakes a moment after its lines; swung over already drawn, as it lands.
    const wake = open.get() < 1 ? delay + (intro ? 1 : 0) : 0;
    anim = animate(open, 1, { duration: 1.1, delay: wake, ease: [0.3, 0, 0.2, 1] });
    timer = setTimeout(blink, (wake + 1.1 + lerp(...BLINK_GAP, Math.random())) * 1000);
    return () => {
      clearTimeout(timer);
      anim?.stop();
    };
  }, [turning, reduced, open, delay, intro]);

  // The iris's circles follow the pointer, the nearer ones further, like the
  // layers of a rune easing apart.
  const centre = useRef<SVGCircleElement>(null);
  const spring = { stiffness: 120, damping: 18, mass: 0.6 };
  const lookX = useSpring(0, spring);
  const lookY = useSpring(0, spring);
  const useLayer = (depth: number) => ({
    x: useTransform(lookX, (v) => v * a * 0.42 * depth),
    y: useTransform(lookY, (v) => v * a * 0.13 * depth),
  });
  const back = useLayer(0.7);
  const mid = useLayer(0.85);
  const front = useLayer(1);
  const accent = useLayer(1.12);
  const pupil = useTransform(near, (d) => r * 0.42 * (1 + 0.22 * d));
  useEffect(() => {
    if (reduced) return;
    const onMove = (e: PointerEvent) => {
      const ctm = centre.current?.getScreenCTM();
      if (!ctm) return;
      const dx = e.clientX - ctm.e;
      const dy = e.clientY - ctm.f;
      const dist = Math.hypot(dx, dy) || 1;
      const reach = Math.min(1, dist / LOOK_REACH);
      lookX.set((dx / dist) * reach);
      lookY.set((dy / dist) * reach);
      near.set(dist < NEAR ? 1 : 0);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerdown", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
    };
  }, [reduced, lookX, lookY, near]);

  // The lids trace themselves in once mounted; the rest fades in around them.
  const [shown, setShown] = useState(reduced || !intro);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  const drawStyle = ([start, duration]: [number, number]): CSSProperties => ({
    strokeDasharray: 1,
    strokeDashoffset: shown ? 0 : 1,
    transition: reduced ? "none" : `stroke-dashoffset ${duration}s cubic-bezier(0.5, 1, 0.89, 1) ${delay + start}s`,
  });
  const fadeStyle = (at: number): CSSProperties => ({
    opacity: shown ? 1 : 0,
    transition: reduced ? "none" : `opacity 0.8s ease-out ${delay + at}s`,
  });
  const box = { x: -2 * a, y: -1.5 * a, width: 4 * a, height: 3 * a };
  const hole = opening(a, open.get());

  return (
    <g fill="none" strokeLinecap="butt" strokeLinejoin="round">
      <defs>
        <clipPath id={`${id}-hole`}>
          <path ref={ref("clip")} d={hole} />
        </clipPath>
        {LIDS.map((_, k) =>
          over[k].length ? (
            <mask key={k} id={`${id}-weave${k}`} maskUnits="userSpaceOnUse" {...box}>
              <rect {...box} fill="white" />
              {over[k].map((i) => (
                <path
                  key={i}
                  ref={ref(`mask${k}-${i}`)}
                  d={initial[i]}
                  pathLength={1}
                  stroke="black"
                  strokeWidth={STROKE[LIDS[i].layer].width + CLEARANCE * 2}
                  style={drawStyle(STROKE[LIDS[i].layer].draw)}
                />
              ))}
            </mask>
          ) : null,
        )}
      </defs>
      <circle ref={centre} r={0} />

      {/* Beyond the eye: the echo, the ripple and the gold almond. */}
      <g style={fadeStyle(0.7)}>
        <path d={almond(ECHO.w * a, ECHO.h * a)} strokeWidth={1} strokeDasharray="2 8" className="stroke-jacaranda-light/35" />
        {shown && !reduced && (
          <path
            d={almond(ALMOND.outer.w * a, ALMOND.outer.h * a)}
            strokeWidth={1}
            vectorEffect="non-scaling-stroke"
            style={{ animationDelay: `${delay + 2.4}s` }}
            className="origin-fill-center animate-eye-ripple stroke-jacaranda-light opacity-0"
          />
        )}
        <path d={almond(GOLD.w * a, GOLD.h * a)} strokeWidth={1} className="stroke-peach-gold/40" />
        <path ref={ref("trace")} d={almond(GOLD.w * a, GOLD.h * a)} pathLength={1} strokeDasharray={1} strokeDashoffset={1} strokeWidth={1.2} className="stroke-peach-gold" />
        <circle cy={-GOLD.h * a} r={5} strokeWidth={1.2} className="fill-night stroke-peach-gold" />
      </g>
      <path
        d={`M${-1.75 * a} 0H${1.75 * a}M0 ${-1.05 * a}V${1.05 * a}`}
        strokeWidth={1}
        strokeDasharray="3 6"
        style={fadeStyle(0.4)}
        className="stroke-jacaranda-light/35"
      />

      {/* The white of the eye hides what lies behind, and bounds the iris. */}
      <path ref={ref("white")} d={hole} className="fill-night-soft stroke-none" />
      <g clipPath={`url(#${id}-hole)`} style={fadeStyle(0.5)}>
        <motion.circle style={back} r={r * 1.22} strokeWidth={1} className="stroke-jacaranda-light/50 [stroke-dasharray:3_4]" />
        <motion.circle style={mid} r={r} strokeWidth={1.1} className="stroke-jacaranda-light" />
        <motion.g style={front}>
          <motion.circle r={pupil} strokeWidth={1.4} className="fill-jacaranda/25 stroke-ivory" />
        </motion.g>
        <motion.circle style={accent} cx={-r * 0.14} cy={-r * 0.14} r={r * 0.12} strokeWidth={1.1} className="stroke-peach-gold" />
      </g>

      {/* A margin of the cover's colour along every lid, so what lies beneath breaks clear of it. */}
      {LIDS.map((lid, k) => (
        <path
          key={k}
          ref={ref(`halo${k}`)}
          d={initial[k]}
          pathLength={1}
          strokeWidth={STROKE[lid.layer].width + CLEARANCE * 2}
          style={drawStyle(STROKE[lid.layer].draw)}
          className="stroke-night"
        />
      ))}

      {/* The lids, inner first so the crisper outer ones sit on top where they meet. */}
      {LIDS.map((lid, k) => {
        const stroke = STROKE[lid.layer];
        return (
          <g key={k} mask={over[k].length ? `url(#${id}-weave${k})` : undefined}>
            <path ref={ref(`lid${k}`)} d={initial[k]} pathLength={1} strokeWidth={stroke.width} style={drawStyle(stroke.draw)} className={stroke.className} />
          </g>
        );
      })}
    </g>
  );
}
