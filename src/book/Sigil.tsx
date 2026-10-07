import { motion } from "motion/react";

/**
 * The book's emblem, all in hairlines: a ticked double ring around a
 * hexagram, with a small eye at its centre. Drawn about (0, 0) with radius
 * `r`; with `draw`, each stroke traces itself in after `delay` seconds.
 */
export function Sigil({ r, draw = false, delay = 0, className = "" }: { r: number; draw?: boolean; delay?: number; className?: string }) {
  const tri = (rot: number) =>
    [0, 120, 240]
      .map((a, i) => {
        const rad = ((a + rot - 90) * Math.PI) / 180;
        return `${i ? "L" : "M"}${(Math.cos(rad) * r * 0.74).toFixed(2)} ${(Math.sin(rad) * r * 0.74).toFixed(2)}`;
      })
      .join(" ") + " Z";
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    const inner = i % 4 === 0 ? 0.84 : 0.88;
    return `M${(Math.cos(a) * r * inner).toFixed(2)} ${(Math.sin(a) * r * inner).toFixed(2)} L${(Math.cos(a) * r * 0.92).toFixed(2)} ${(Math.sin(a) * r * 0.92).toFixed(2)}`;
  }).join(" ");
  const vertices = Array.from({ length: 6 }, (_, i) => {
    const a = ((i * 60 - 90) * Math.PI) / 180;
    return [Math.cos(a) * r * 0.74, Math.sin(a) * r * 0.74] as const;
  });

  const strokes = [
    { d: circle(r), className: "stroke-jacaranda-light/60" },
    { d: circle(r * 0.92), className: "stroke-jacaranda-light/40" },
    { d: ticks, className: "stroke-jacaranda-light/50" },
    { d: tri(0), className: "stroke-jacaranda/50" },
    { d: tri(60), className: "stroke-jacaranda/50" },
    { d: circle(r * 0.37), className: "stroke-peach-gold" },
    { d: `M${-r * 0.2} 0 Q0 ${-r * 0.14} ${r * 0.2} 0 Q0 ${r * 0.14} ${-r * 0.2} 0 Z`, className: "stroke-jacaranda/70" },
  ];

  return (
    <g className={className} fill="none" strokeWidth={1}>
      {strokes.map((s, i) => (
        <motion.path
          key={i}
          d={s.d}
          className={s.className}
          initial={draw ? { pathLength: 0, opacity: 0 } : false}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ pathLength: { duration: 1.6, delay: delay + i * 0.15, ease: "easeInOut" }, opacity: { duration: 0.3, delay: delay + i * 0.15 } }}
        />
      ))}
      <motion.circle
        r={r * 0.05}
        className="fill-jacaranda"
        initial={draw ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: delay + 1.4 }}
      />
      {vertices.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r={Math.max(1.5, r * 0.022)}
          className="fill-peach-gold"
          initial={draw ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: delay + 1.2 + i * 0.08 }}
        />
      ))}
    </g>
  );
}

/** A circle as a path, so it can trace itself in from the top. */
export function circle(r: number) {
  return `M0 ${-r} A${r} ${r} 0 1 1 0 ${r} A${r} ${r} 0 1 1 0 ${-r}`;
}
