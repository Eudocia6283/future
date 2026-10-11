import { DIMENSIONS, DIMENSION_LABELS, dimensionCoverage, type Profile } from "../../shared/oracle";
import { DIMENSION_COLOURS } from "../prophecy/WordCloud";

// How much of each side of the seeker the book has come to know, as a heptagon
// with one axis per dimension. Only required entries count, so a dimension
// reaches full only when everything it must know is known.

const SIZE = 300;
const C = SIZE / 2;
const R = 100;
const RINGS = [0.25, 0.5, 0.75, 1];

const at = (i: number, r: number) => {
  const a = (-90 + (i * 360) / DIMENSIONS.length) * (Math.PI / 180);
  return [C + Math.cos(a) * r, C + Math.sin(a) * r] as const;
};
const poly = (pts: readonly (readonly [number, number])[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");

export function DimensionChart({ profile }: { profile: Profile }) {
  const covers = DIMENSIONS.map((d) => dimensionCoverage(profile, d));
  const shape = covers.map((v, i) => at(i, R * v));
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-8">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[19rem] shrink-0" role="img" aria-label="预言书对七个维度的了解程度">
        {RINGS.map((f) => (
          <polygon key={f} points={poly(DIMENSIONS.map((_, i) => at(i, R * f)))} className="fill-none stroke-jacaranda-light/25" strokeWidth={0.6} />
        ))}
        {DIMENSIONS.map((d, i) => {
          const [x, y] = at(i, R);
          return <line key={d} x1={C} y1={C} x2={x} y2={y} className="stroke-jacaranda-light/25" strokeWidth={0.6} />;
        })}
        <polygon points={poly(shape)} className="fill-jacaranda/15 stroke-jacaranda" strokeWidth={1.2} />
        {shape.map(([x, y], i) => (
          <circle key={DIMENSIONS[i]} cx={x} cy={y} r={2.4} className="fill-peach-gold" />
        ))}
        {DIMENSIONS.map((d, i) => {
          const [x, y] = at(i, R + 22);
          const anchor = Math.abs(x - C) < 6 ? "middle" : x > C ? "start" : "end";
          return (
            <text key={d} x={x} y={y} textAnchor={anchor} dominantBaseline="central" className="fill-ink/55 font-song" style={{ fontSize: 10.5 }}>
              {DIMENSION_LABELS[d]}
            </text>
          );
        })}
      </svg>
      <ul className="flex w-full min-w-0 flex-col gap-2">
        {DIMENSIONS.map((d, i) => (
          <li key={d} className="flex items-center gap-3">
            <span className={`w-[3.6rem] shrink-0 font-song text-[0.7rem] tracking-[0.08em] ${DIMENSION_COLOURS[d]}`}>{DIMENSION_LABELS[d]}</span>
            <span className="relative h-px min-w-0 flex-1 bg-jacaranda-light/25">
              <span className="absolute inset-y-0 left-0 bg-peach-gold" style={{ width: `${covers[i] * 100}%` }} />
            </span>
            <span className="w-9 shrink-0 text-right font-sans text-[0.65rem] text-ink/50">{Math.round(covers[i] * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
