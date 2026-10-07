import { motion } from "motion/react";
import type { Geometry } from "./geometry";

/**
 * The open book: the dark board behind, the page block along the fore-edge,
 * the pages with their ruled borders, and the spine. With `draw`,
 * every line traces itself in after `delay` seconds, board first. With
 * `half`, a spread shows only its right half, while its left half turns over
 * as the cover.
 */
export function BookFrame({ geo, draw, delay = 0, half = false }: { geo: Geometry; draw: boolean; delay?: number; half?: boolean }) {
  const left = !(half && geo.layout === "spread");
  const line = (order: number, duration = 1.4) => ({
    initial: draw ? { pathLength: 0, opacity: 0 } : false,
    animate: { pathLength: 1, opacity: 1 },
    transition: {
      pathLength: { duration, delay: delay + order * 0.12, ease: "easeInOut" as const },
      opacity: { duration: 0.2, delay: delay + order * 0.12 },
    },
  });
  const fade = (order: number) => ({
    initial: draw ? { opacity: 0 } : false,
    animate: { opacity: 1 },
    transition: { duration: 1, delay: delay + order * 0.12 },
  });
  const { border: b } = geo;
  // The border is broken at its top centre for a small diamond.
  const mid = b.x + b.w / 2;
  const borderPath = `M${mid - 14} ${b.y} L${b.x} ${b.y} L${b.x} ${b.y + b.h} L${b.x + b.w} ${b.y + b.h} L${b.x + b.w} ${b.y} L${mid + 14} ${b.y}`;
  const diamond = `M${mid} ${b.y - 6} L${mid + 6} ${b.y} L${mid} ${b.y + 6} L${mid - 6} ${b.y} Z`;
  const corners = [
    [b.x, b.y],
    [b.x + b.w, b.y],
    [b.x, b.y + b.h],
    [b.x + b.w, b.y + b.h],
  ];

  const page = (
    <>
      {geo.stack.map((d, i) => (
        <motion.path key={d} d={d} className="stroke-ivory/50" {...line(1 + i)} />
      ))}
      <motion.path d={geo.page} className="fill-paper stroke-jacaranda-light/70" {...line(0, 1.8)} />
      <motion.path d={borderPath} className="stroke-jacaranda-light/35" {...line(4, 1.6)} />
      <motion.path d={diamond} className="stroke-peach-gold" {...line(6, 0.8)} />
      {corners.map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={2.2} className="fill-peach-gold stroke-none" {...fade(8 + i)} />
      ))}
    </>
  );

  return (
    <g fill="none" strokeWidth={1}>
      {left && <motion.path d={geo.board} className="fill-night stroke-jacaranda/70" {...line(0, 1.6)} />}
      {geo.layout === "spread" && (
        <motion.path d={geo.board} transform={`translate(${geo.width} 0) scale(-1 1)`} className="fill-night stroke-jacaranda/70" {...line(0, 1.6)} />
      )}
      {left && page}
      {geo.layout === "spread" && <g transform={`translate(${geo.width} 0) scale(-1 1)`}>{page}</g>}
      {left && geo.gutter.map((d, i) => <motion.path key={d} d={d} className={i ? "stroke-jacaranda-light/15" : "stroke-jacaranda-light/25"} {...line(3)} />)}
      {geo.layout === "spread" &&
        geo.gutter.map((d, i) => (
          <motion.path
            key={`r${d}`}
            d={d}
            transform={`translate(${geo.width} 0) scale(-1 1)`}
            className={i ? "stroke-jacaranda-light/15" : "stroke-jacaranda-light/25"}
            {...line(3)}
          />
        ))}
      <motion.path
        d={`M${geo.spine} ${geo.layout === "spread" ? 58 : 34} L${geo.spine} ${geo.layout === "spread" ? 632 : 798}`}
        className="stroke-jacaranda/40"
        {...line(2)}
      />
    </g>
  );
}
