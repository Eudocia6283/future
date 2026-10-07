import { motion } from "motion/react";
import { useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { DIMENSIONS, DIMENSION_LABELS, type Dimension, type Portrait } from "../../shared/oracle";
import { PageSettle } from "../book/InkText";

// The cloud is laid out in a W×H box about (0, 0), in em of the page's text.
const W = 22;
const H = 26;
// Font size, in em, of a word of each weight 1–5.
const SIZE = [0, 0.78, 0.95, 1.2, 1.55, 2.05];
// Space kept clear around each word, in em.
const PAD = 0.28;

/** The colour each side of the seeker is written in. */
export const DIMENSION_COLOURS: Record<Dimension, string> = {
  situation: "text-ink",
  academics: "text-jacaranda",
  experience: "text-[#b07c5b]",
  interest: "text-[#7a4fc4]",
  style: "text-sage",
  values: "text-rose",
  constraints: "text-ink/55",
};

type Placed = { word: string; weight: number; dim: Dimension; x: number; y: number; w: number; h: number; vertical: boolean; order: number };

/** A word's width in em at size 1: CJK characters are square, Latin narrower. */
const measure = (word: string) => [...word].reduce((w, ch) => w + (/[⺀-￿]/.test(ch) ? 1 : ch === " " ? 0.3 : 0.58), 0);

/** A small deterministic generator, so a portrait's cloud is laid out the same every time. */
function seeded(text: string) {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Places the words heaviest first, each at the first point along a spiral
 * out from the centre where it overlaps nothing placed. Some lighter
 * Chinese words stand upright, as in a column of type. Words that find no
 * room are left out.
 */
function layout(keywords: Portrait["keywords"]): Placed[] {
  const random = seeded(keywords.map((k) => k.word).join());
  const sorted = [...keywords].sort((a, b) => b.weight - a.weight || b.word.length - a.word.length);
  const placed: Placed[] = [];
  const overlaps = (a: Placed) =>
    placed.some((b) => Math.abs(a.x - b.x) * 2 < a.w + b.w + PAD * 2 && Math.abs(a.y - b.y) * 2 < a.h + b.h + PAD * 2);
  const inside = (a: Placed) => Math.abs(a.x) * 2 + a.w <= W && Math.abs(a.y) * 2 + a.h <= H;

  sorted.forEach((k, order) => {
    const size = SIZE[k.weight];
    const long = measure(k.word) * size;
    const vertical = k.weight <= 3 && order > 3 && !/[a-z]/i.test(k.word) && random() < 0.3;
    const box = { ...k, w: vertical ? size : long, h: vertical ? long : size * 1.15, vertical, order };
    const turn = random() * Math.PI * 2;
    for (let t = 0; t < 900; t++) {
      const a = turn + t * 0.35;
      const r = 0.12 * t * 0.35;
      // The spiral is stretched to the box's proportions.
      const p = { ...box, x: Math.cos(a) * r * (W / H), y: Math.sin(a) * r };
      if (inside(p) && !overlaps(p)) {
        placed.push(p);
        return;
      }
    }
  });
  return placed;
}

/**
 * The seeker's keywords as a cloud: the more a thing stands out in them the
 * larger it is written, coloured by the side of them it belongs to. Each
 * word surfaces in turn, heaviest first, as ink does.
 */
export function WordCloud({ keywords }: { keywords: Portrait["keywords"] }) {
  const words = useMemo(() => layout(keywords), [keywords]);
  const settle = useContext(PageSettle);
  const present = DIMENSIONS.filter((d) => words.some((w) => w.dim === d));
  // The cloud is scaled down to fit whatever room the page leaves it.
  const room = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = room.current;
    if (!el) return;
    const fit = () => {
      const em = parseFloat(getComputedStyle(el).fontSize);
      setScale(Math.min(1, el.clientWidth / (W * em), el.clientHeight / (H * em)));
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* A single page has no set height, so the cloud keeps one of its own. */}
      <div ref={room} className="relative min-h-[18em] flex-1">
        <div className="absolute top-1/2 left-1/2" style={{ width: `${W}em`, height: `${H}em`, transform: `translate(-50%, -50%) scale(${scale})` }}>
          {words.map((w) => (
            <motion.span
              key={w.word}
              title={DIMENSION_LABELS[w.dim]}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: w.weight >= 3 ? 1 : 0.8, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: settle + 0.3 + w.order * 0.08 }}
              className={`absolute font-song leading-none whitespace-nowrap ${DIMENSION_COLOURS[w.dim]} ${w.weight >= 4 ? "font-semibold" : ""}`}
              style={{
                // In fractions of the cloud, since each word's own em is its own size.
                left: `${((W / 2 + w.x - w.w / 2) / W) * 100}%`,
                top: `${((H / 2 + w.y - w.h / 2) / H) * 100}%`,
                fontSize: `${SIZE[w.weight]}em`,
                writingMode: w.vertical ? "vertical-rl" : undefined,
                letterSpacing: w.vertical ? 0 : "0.02em",
                lineHeight: w.vertical ? 1 : 1.15,
              }}
            >
              {w.word}
            </motion.span>
          ))}
        </div>
      </div>
      <motion.ul
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: settle + 0.5 + words.length * 0.08 }}
        className="flex flex-wrap justify-center gap-x-[1em] gap-y-[0.3em] pt-[0.8em]"
      >
        {present.map((d) => (
          <li key={d} className={`flex items-center gap-[0.4em] font-song text-[0.58em] tracking-[0.1em] ${DIMENSION_COLOURS[d]}`}>
            <span className="size-[0.5em] rotate-45 bg-current opacity-70" />
            {DIMENSION_LABELS[d]}
          </li>
        ))}
      </motion.ul>
    </div>
  );
}
