import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { useContext, useEffect, useRef } from "react";
import { circle } from "../Sigil";
import { CoverIntro } from "./intro";
import { useSvgId } from "./svgId";

// Seconds for the light to run the whole star; two comets run it at once.
const FLOW_LAP = 14;
const COMETS = 2;
// The layers of a comet, tail first, as fractions of the star's length. Their
// heads are aligned, so the longer, fainter layers trail behind as its tail.
const COMET_LAYERS = [
  { len: 0.09, width: 3.2, className: "stroke-peach-gold/35" },
  { len: 0.045, width: 1.6, className: "stroke-peach-gold" },
  { len: 0.012, width: 1.4, className: "stroke-ivory" },
];
const TAIL = Math.max(...COMET_LAYERS.map((l) => l.len));
const INSCRIPTION = "QVOD FVIT · QVOD EST · QVOD ERIT · ";

const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [Math.cos(a) * r, Math.sin(a) * r] as const;
};
const pt = ([x, y]: readonly [number, number]) => `${x.toFixed(2)} ${y.toFixed(2)}`;

/**
 * The pentagram circle beneath the cover's title and eye, drawn about (0, 0)
 * with radius `r`, and pale so the others stand out. It is never turned; a
 * light runs along the star instead, drawn as one unbroken line.
 */
export function CoverCircle({ r, delay = 0 }: { r: number; delay?: number }) {
  const reduced = useReducedMotion() ?? false;
  const id = useSvgId("circle");
  const intro = useContext(CoverIntro);
  const tips = Array.from({ length: 5 }, (_, i) => at(-90 + 72 * i, r * 0.84));
  const star = [0, 2, 4, 1, 3].map((k, i) => `${i ? "L" : "M"}${pt(tips[k])}`).join(" ") + " Z";
  // Where the star's lines cross, around its inner pentagon.
  const crossings = Array.from({ length: 5 }, (_, i) => at(-54 + 72 * i, r * 0.84 * 0.382));
  const inner = Array.from({ length: 5 }, (_, i) => at(90 + 72 * i, r * 0.14));
  const ticks = Array.from({ length: 72 }, (_, i) => `M${pt(at(i * 5, r * 0.88))} L${pt(at(i * 5, i % 3 ? r * 0.9 : r * 0.92))}`).join(" ");
  // The inscription runs all the way round the star's heart, just outside its inner circle.
  const heart = r * 0.84 * 0.309;
  const ring = heart * 1.1;

  const draw = (i: number, duration = 1.8) => ({
    initial: intro ? { pathLength: 0, opacity: 0 } : false,
    animate: { pathLength: 1, opacity: 1 },
    transition: {
      pathLength: { duration, delay: delay + i * 0.12, ease: "easeInOut" as const },
      opacity: { duration: 0.2, delay: delay + i * 0.12 },
    },
  });
  const fade = (at: number) => ({ initial: intro ? { opacity: 0 } : false, animate: { opacity: 1 }, transition: { duration: 1.2, delay: delay + at } });

  // The light's position along the star, 0 → 1 a lap, set straight onto each layer's dashes.
  const flow = useMotionValue(0);
  const layers = useRef<(SVGPathElement | null)[]>([]);
  useEffect(() => {
    const place = (t: number) =>
      layers.current.forEach((el, i) => {
        const len = COMET_LAYERS[i % COMET_LAYERS.length].len;
        el?.style.setProperty("stroke-dashoffset", String(-(t + TAIL - len)));
      });
    place(flow.get());
    const unsubscribe = flow.on("change", place);
    const anim = reduced ? undefined : animate(flow, [0, 1], { duration: FLOW_LAP, ease: "linear", repeat: Infinity });
    return () => {
      unsubscribe();
      anim?.stop();
    };
  }, [flow, reduced]);
  const comet = (glow: boolean) =>
    COMET_LAYERS.map(({ len, width, className }, i) => (
      <path
        key={i}
        ref={(el) => {
          layers.current[(glow ? COMET_LAYERS.length : 0) + i] = el;
        }}
        d={star}
        pathLength={1}
        strokeWidth={glow ? width * 2.5 : width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={`${len} ${1 / COMETS - len}`}
        className={className}
      />
    ));

  return (
    <g fill="none" strokeWidth={0.8}>
      <defs>
        <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={4} />
        </filter>
      </defs>
      <motion.path d={circle(r)} className="stroke-jacaranda-light/40" {...draw(0, 2)} />
      <motion.path d={circle(r * 1.035)} strokeWidth={0.5} className="stroke-jacaranda-light/25" {...draw(1, 2)} />
      <motion.path d={circle(r * 0.88)} className="stroke-jacaranda-light/35" {...draw(2, 2)} />
      <motion.path d={ticks} strokeWidth={0.6} className="stroke-jacaranda-light/35" {...fade(1)} />
      <motion.path d={star} strokeLinejoin="round" className="stroke-jacaranda-light/45" {...draw(3, 2.4)} />
      <motion.path d={circle(heart)} className="stroke-jacaranda-light/40" {...draw(5)} />
      <motion.path d={circle(ring * 1.12)} strokeWidth={0.5} className="stroke-jacaranda-light/30" {...draw(6)} />
      <path id={`${id}-ring`} d={circle(ring)} stroke="none" />
      <motion.text className="fill-jacaranda-light/70 font-serif" style={{ fontSize: heart * 0.11 }} {...fade(1.4)}>
        <textPath href={`#${id}-ring`} textLength={2 * Math.PI * ring - heart * 0.1} lengthAdjust="spacing">
          {INSCRIPTION}
        </textPath>
      </motion.text>
      <motion.path d={`M${inner.map(pt).join(" L")} Z`} strokeWidth={0.6} className="stroke-peach-gold/50" {...draw(7)} />
      {tips.map((p, i) => (
        <motion.circle key={i} cx={p[0]} cy={p[1]} r={r * 0.02} className="stroke-jacaranda-light/50" {...fade(1.6 + i * 0.08)} />
      ))}
      {crossings.map((p, i) => (
        <motion.circle key={i} cx={p[0]} cy={p[1]} r={r * 0.008} className="fill-peach-gold stroke-none" {...fade(1.8 + i * 0.08)} />
      ))}

      {/* The running light, and a blurred copy of it for its glow. */}
      <motion.g {...fade(2.2)}>
        <g filter={`url(#${id})`} opacity={0.6}>
          {comet(true)}
        </g>
        {comet(false)}
      </motion.g>
    </g>
  );
}
