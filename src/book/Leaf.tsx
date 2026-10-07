import { animate } from "motion/react";
import { useEffect, useRef } from "react";
import { turnMatrix, type Geometry } from "./geometry";

export const LEAF_TURN = 1.1;

/**
 * A single leaf turning over, laid above the page content so it sweeps
 * across it. `forward` turns right to left, as reading on; otherwise left to
 * right. On a single page the leaf lifts away to the left and fades.
 */
export function Leaf({ geo, forward, onDone }: { geo: Geometry; forward: boolean; onDone: () => void }) {
  const ref = useRef<SVGGElement>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const single = geo.layout === "single";

  useEffect(() => {
    const [from, to] = single ? [0, 0.62] : forward ? [0, 1] : [1, 0];
    const anim = animate(from, to, {
      duration: LEAF_TURN,
      ease: [0.45, 0, 0.25, 1],
      onUpdate: (t) => {
        const g = ref.current;
        if (!g) return;
        g.setAttribute("transform", turnMatrix(t, geo.spine));
        if (single) g.setAttribute("opacity", String(Math.min(1, (0.62 - t) * 3)));
      },
      onComplete: () => onDoneRef.current(),
    });
    return () => anim.stop();
  }, [forward, single, geo.spine]);

  const { border: b } = geo;
  // The leaf is drawn as the right-hand (or only) page.
  const mirror = geo.layout === "spread" ? `translate(${geo.width} 0) scale(-1 1)` : undefined;
  return (
    <g ref={ref} fill="none" strokeWidth={1} transform={turnMatrix(single || forward ? 0 : 1, geo.spine)}>
      <g transform={mirror}>
        <path d={geo.page} className="fill-paper stroke-jacaranda-light/70" />
        <rect x={b.x} y={b.y} width={b.w} height={b.h} className="stroke-jacaranda-light/25" />
      </g>
    </g>
  );
}
