import { animate, motion, useAnimationFrame, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { useEffect } from "react";

// Degrees per second each layer turns at rest (outer and inner clockwise, the
// middle against them, at the Atelier's 1 : 2 : 4), and how much faster they
// all turn while the book is thinking.
const TURN = { outer: 1.5, middle: -3, inner: 6 };
const THINKING_SPEED = 5;
// How far each layer drifts with the pointer, in px: the inner layer is nearest.
const PARALLAX = { outer: 10, middle: 25, inner: 50 };
// Opacity of the lines at rest and while thinking.
const REST_OPACITY = 0.6;
const THINKING_OPACITY = 0.95;

const polar = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [400 + r * Math.cos(a), 400 + r * Math.sin(a)] as const;
};
const STAR_VERTICES = Array.from({ length: 8 }, (_, i) => -90 + i * 45);

/**
 * The Atelier's magic circle, standing behind the book: three layers turning
 * at their own pace and drifting with the pointer. While the book thinks the
 * circle speeds up, brightens and glows.
 */
export function MagicCircle({ thinking }: { thinking: boolean }) {
  const reduced = useReducedMotion() ?? false;

  // Pointer position, 0–1 of the viewport, starting centred.
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [mouseX, mouseY]);
  const spring = { damping: 50, stiffness: 400 };
  const smoothX = useSpring(mouseX, spring);
  const smoothY = useSpring(mouseY, spring);
  const depth = (v: number, range: number) => (reduced ? 0 : (v - 0.5) * 2 * range);

  // `awake` eases between rest (0) and thinking (1); it sets the speed, brightness and glow.
  const awake = useMotionValue(thinking ? 1 : 0);
  useEffect(() => {
    const anim = animate(awake, thinking ? 1 : 0, { duration: thinking ? 1.6 : 2.4, ease: "easeInOut" });
    return () => anim.stop();
  }, [thinking, awake]);

  const turn = useMotionValue(0);
  useAnimationFrame((_, delta) => {
    if (reduced) return;
    const speed = 1 + (THINKING_SPEED - 1) * awake.get();
    turn.set(turn.get() + (speed * Math.min(delta, 100)) / 1000);
  });

  const useLayer = (key: keyof typeof TURN) => ({
    x: useTransform(() => depth(smoothX.get(), PARALLAX[key])),
    y: useTransform(() => depth(smoothY.get(), PARALLAX[key])),
    rotate: useTransform(() => turn.get() * TURN[key]),
  });
  const outer = useLayer("outer");
  const middle = useLayer("middle");
  const inner = useLayer("inner");

  const opacity = useTransform(awake, (a) => REST_OPACITY + (THINKING_OPACITY - REST_OPACITY) * a);
  const haloOpacity = useTransform(awake, (a) => 0.25 + 0.65 * a);
  const violet = useTransform(awake, (a) => (0.05 + 0.12 * a).toFixed(3));
  const gold = useTransform(awake, (a) => (0.03 + 0.07 * a).toFixed(3));
  const backdrop = useMotionTemplate`radial-gradient(circle, rgba(180,150,232,${violet}) 0%, rgba(229,190,165,${gold}) 35%, rgba(255,255,255,0) 70%)`;

  const layers = (
    <>
      <motion.div style={outer} className="absolute inset-0">
        <svg viewBox="0 0 800 800" fill="none" className="size-full overflow-visible">
          <circle cx="400" cy="400" r="390" strokeWidth="0.5" className="stroke-jacaranda-light opacity-60" />
          <circle cx="400" cy="400" r="380" strokeWidth="1" className="stroke-jacaranda" strokeDasharray="4 12" />
          <circle cx="400" cy="400" r="360" strokeWidth="0.5" className="stroke-peach-gold" />
          {Array.from({ length: 36 }, (_, i) => {
            const [x1, y1] = polar(i * 10, 360);
            const [x2, y2] = polar(i * 10, 366);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1" className="stroke-jacaranda-light" />;
          })}
          <line x1="400" y1="-200" x2="400" y2="1000" strokeWidth="0.35" className="stroke-jacaranda-light opacity-50" />
          <line x1="-200" y1="400" x2="1000" y2="400" strokeWidth="0.35" className="stroke-jacaranda-light opacity-50" />
        </svg>
      </motion.div>

      <motion.div style={middle} className="absolute inset-0">
        <svg viewBox="0 0 800 800" fill="none" className="size-full overflow-visible">
          <circle cx="400" cy="400" r="280" strokeWidth="0.6" className="stroke-jacaranda opacity-70" />
          <rect x="202" y="202" width="396" height="396" strokeWidth="0.6" className="stroke-peach-gold" />
          <rect x="202" y="202" width="396" height="396" transform="rotate(45 400 400)" strokeWidth="0.6" className="stroke-peach-gold" />
          {STAR_VERTICES.map((deg) => {
            const [x, y] = polar(deg, 280);
            return <circle key={deg} cx={x} cy={y} r="4" strokeWidth="1" className="stroke-jacaranda" />;
          })}
          <circle cx="400" cy="400" r="198" strokeWidth="0.75" className="stroke-jacaranda" strokeDasharray="3 6" />
        </svg>
      </motion.div>

      <motion.div style={inner} className="absolute inset-0">
        <svg viewBox="0 0 800 800" fill="none" className="size-full overflow-visible">
          <path d="M400 250 L530 475 L270 475 Z" strokeWidth="0.6" className="stroke-jacaranda-light" />
          <path d="M400 550 L530 325 L270 325 Z" strokeWidth="0.6" className="stroke-jacaranda-light" />
          <circle cx="400" cy="400" r="150" strokeWidth="0.6" className="stroke-peach-gold opacity-80" />
          <circle cx="400" cy="400" r="135" strokeWidth="0.6" className="stroke-jacaranda" />
          <rect x="345" y="345" width="110" height="110" transform="rotate(22.5 400 400)" strokeWidth="0.6" className="stroke-peach-gold" />
          <rect x="345" y="345" width="110" height="110" transform="rotate(67.5 400 400)" strokeWidth="0.6" className="stroke-peach-gold" />
          <circle cx="400" cy="400" r="60" strokeWidth="1" className="stroke-jacaranda-light" strokeDasharray="1 3" />
          <circle cx="400" cy="400" r="45" strokeWidth="0.6" className="stroke-jacaranda" />
          <circle cx="400" cy="400" r="4" className="fill-peach-gold opacity-80" />
        </svg>
      </motion.div>
    </>
  );

  return (
    <div
      className="pointer-events-none fixed top-1/2 left-1/2 size-[max(115vmin,min(100vmax,1100px))] -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    >
      {/* Soft light behind the circle. */}
      <motion.div style={{ backgroundImage: backdrop }} className="absolute -inset-[20%] rounded-full" />
      <motion.div style={{ opacity }} className="absolute inset-0">
        {/* Glow: a blurred copy of the lines, strongest while thinking. */}
        <motion.div style={{ opacity: haloOpacity }} className="absolute inset-0 [filter:blur(6px)_saturate(1.6)] will-change-[opacity]">
          {layers}
        </motion.div>
        {layers}
      </motion.div>
    </div>
  );
}
