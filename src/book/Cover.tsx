import { AnimatePresence, animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { turnMatrix, type Geometry } from "./geometry";
import { CoverCircle } from "./cover/CoverCircle";
import { CoverEye } from "./cover/CoverEye";
import { CoverLettering, TitleChar, type LetteringLayout } from "./cover/CoverTitle";
import { CoverIntro } from "./cover/intro";
import { useSvgId } from "./cover/svgId";

export const COVER_TURN = 1.4;

// The width of the hinge strip along the cover's spine side, and how far in
// from the board's edges its gold frame runs.
const HINGE = 22;
const FRAME = 14;
// Where the cover's figures sit, in fractions of the board beside the hinge:
// x of its width and y of its height; sizes are fractions of its width.
const COMPOSITION = {
  spread: {
    circle: { y: 0.56, r: 0.72 },
    eye: { x: 0.5, y: 0.4, a: 0.3 },
    title: { x: [0.29, 0.71], y: 0.61, size: 0.42 },
    top: 0.06,
    bottom: 0.935,
    fore: 0.23,
  },
  single: {
    circle: { y: 0.55, r: 0.74 },
    eye: { x: 0.5, y: 0.37, a: 0.31 },
    title: { x: [0.29, 0.71], y: 0.56, size: 0.42 },
    top: 0.05,
    bottom: 0.945,
    fore: 0.2,
  },
};
// How far the board beneath, and the page edges between, stand out below and beside the cover.
const THICKNESS = [3, 6, 9];

/**
 * The closed book's front cover, in dark cloth: a pale pentagram circle
 * running off its edges, the eye, and the great hollow 预言 across it. 言
 * lies beneath the eye and 预 over it, so title and eye cover each other in
 * turn; a gold frame and small lettering finish it like a title page.
 *
 * Once `opening`, the cover swings over about the spine, showing its inside
 * on the far side, then fades as the pages are drawn. `closing` plays that
 * backwards: on a spread its inside is the open book's left half, board and
 * page, which swings over onto the right to become the finished cover. A
 * book closed on a reading has a bookmark standing out of it, labelled with
 * where it was left.
 */
export function Cover({
  geo,
  opening,
  closing = false,
  bookmark,
  onOpened,
  onClosed,
}: {
  geo: Geometry;
  opening: boolean;
  closing?: boolean;
  bookmark?: string;
  onOpened: () => void;
  onClosed?: () => void;
}) {
  const turnRef = useRef<SVGGElement>(null);
  const frontRef = useRef<SVGGElement>(null);
  const backRef = useRef<SVGGElement>(null);
  const restRef = useRef<SVGGElement>(null);
  const reduced = useReducedMotion() ?? false;
  const id = useSvgId("cover");
  const onOpenedRef = useRef(onOpened);
  onOpenedRef.current = onOpened;
  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  // A cover shown by closing the book swings over already drawn.
  const [intro] = useState(!closing);
  const single = geo.layout === "single";
  // A closing single page starts part-way through the turn, as its leaf does, rather than from far off to the left.
  const closeFrom = single ? 0.62 : 1;

  useEffect(() => {
    if (!opening) return;
    if (reduced) return onOpenedRef.current();
    const anim = animate(0, 1, {
      duration: COVER_TURN,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (t) => {
        turnRef.current?.setAttribute("transform", turnMatrix(t, geo.spine, 0.04));
        frontRef.current?.setAttribute("opacity", t < 0.5 ? "1" : "0");
        backRef.current?.setAttribute("opacity", t < 0.5 ? "0" : String(1 - (t - 0.5) * 1.6));
        restRef.current?.setAttribute("opacity", String(Math.max(0, 1 - t * 5)));
      },
      onComplete: () => onOpenedRef.current(),
    });
    return () => anim.stop();
  }, [opening, reduced, geo.spine]);

  useEffect(() => {
    if (!closing) return;
    if (reduced) return onClosedRef.current?.();
    const anim = animate(closeFrom, 0, {
      duration: single ? COVER_TURN * 0.8 : COVER_TURN,
      ease: [0.65, 0, 0.35, 1],
      onUpdate: (t) => {
        turnRef.current?.setAttribute("transform", turnMatrix(t, geo.spine, 0.04));
        frontRef.current?.setAttribute("opacity", t < 0.5 ? "1" : "0");
        backRef.current?.setAttribute("opacity", t < 0.5 ? "0" : single ? String(Math.min(1, (closeFrom - t) * 8)) : "1");
        restRef.current?.setAttribute("opacity", String(Math.max(0, 1 - t * 5)));
      },
      onComplete: () => onClosedRef.current?.(),
    });
    return () => anim.stop();
  }, [closing, reduced, single, closeFrom, geo.spine]);

  const { x, y, w, h } = geo.cover;
  const boardAt = (dx: number, dy: number) =>
    `M${x + dx} ${y + dy} H${x + dx + w - 14} Q${x + dx + w} ${y + dy} ${x + dx + w} ${y + dy + 14} V${y + dy + h - 14} Q${x + dx + w} ${y + dy + h} ${x + dx + w - 14} ${y + dy + h} H${x + dx} Z`;
  const board = boardAt(0, 0);
  const hinge = x + HINGE;
  // The composition is laid out in fractions of the board beside the hinge.
  const c = COMPOSITION[geo.layout];
  const iw = w - HINGE;
  const px = (f: number) => hinge + iw * f;
  const py = (f: number) => y + h * f;
  const size = iw * c.title.size;
  const small = iw * 0.026;
  const lettering: LetteringLayout = {
    top: [px(0.5), py(c.top)],
    bottom: [px(0.5), py(c.bottom)],
    fore: [x + w - FRAME - small * 1.4, py(c.fore)],
    size: small,
  };
  const draw = (i: number) => ({
    initial: intro ? { pathLength: 0, opacity: 0 } : false,
    animate: { pathLength: 1, opacity: 1 },
    transition: { pathLength: { duration: 1.6, delay: 0.2 + i * 0.15, ease: "easeInOut" as const }, opacity: { duration: 0.2, delay: 0.2 + i * 0.15 } },
  });
  const fade = (delay: number) => ({ initial: intro ? { opacity: 0 } : false, animate: { opacity: 1 }, transition: { duration: 1, delay } });

  // The gold frame inside the board, with Portal-like X's where its lines run
  // on past the corners.
  const f = { l: hinge + FRAME, t: y + FRAME, r: x + w - FRAME, b: y + h - FRAME };
  const run = 9;
  const frame = [
    `M${f.l - run} ${f.t}H${f.r + run}`,
    `M${f.l - run} ${f.b}H${f.r + run}`,
    `M${f.l} ${f.t - run}V${f.b + run}`,
    `M${f.r} ${f.t - run}V${f.b + run}`,
  ].join("");

  return (
    <g fill="none" strokeWidth={1}>
      <defs>
        <clipPath id={`${id}-board`}>
          <path d={board} />
        </clipPath>
        <pattern id={`${id}-cloth`} patternUnits="userSpaceOnUse" width={5} height={5} patternTransform="rotate(45)">
          <path d="M0 0V5" strokeWidth={1} className="stroke-white/[0.045]" />
        </pattern>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={16} />
        </filter>
      </defs>
      {/* The shadow the closed book casts, and its thickness: the board beneath and
          the page edges between. They stay put as the cover turns, fading as it lifts. */}
      <g ref={restRef} opacity={closing ? 0 : 1}>
        <motion.path d={boardAt(6, 18)} filter={`url(#${id}-shadow)`} className="fill-night/35" {...fade(0.4)} />
        <motion.g {...fade(0.3)}>
          <path d={boardAt(THICKNESS[2], THICKNESS[2])} className="fill-night stroke-jacaranda/50" />
          {THICKNESS.slice(0, 2).map((t) => (
            <path key={t} d={boardAt(t, t)} className="fill-paper stroke-jacaranda-light/60" />
          ))}
        </motion.g>
      </g>
      <g ref={turnRef} transform={closing ? turnMatrix(closeFrom, geo.spine, 0.04) : undefined}>
        <CoverIntro.Provider value={intro}>
          <g ref={frontRef} opacity={closing ? 0 : 1}>
            <AnimatePresence>{bookmark && <BookmarkCard key={bookmark} geo={geo} label={bookmark} />}</AnimatePresence>

            <motion.path d={board} className="fill-night stroke-jacaranda/70" {...draw(0)} />
            <g clipPath={`url(#${id}-board)`}>
              <motion.rect x={x} y={y} width={w} height={h} fill={`url(#${id}-cloth)`} {...fade(0.4)} />
              <motion.path d={`M${hinge} ${y} V${y + h} M${hinge + 4} ${y} V${y + h}`} className="stroke-jacaranda-light/25" {...draw(1)} />

              {/* The circle beneath; 言 below the eye; 预 above it; the frame and lettering over all. */}
              <g transform={`translate(${px(0.5)} ${py(c.circle.y)})`}>
                <CoverCircle r={iw * c.circle.r} delay={0.3} />
              </g>
              <TitleChar ch="言" x={px(c.title.x[1])} y={py(c.title.y)} size={size} delay={1.25} />
              <g transform={`translate(${px(c.eye.x)} ${py(c.eye.y)})`}>
                <CoverEye a={iw * c.eye.a} delay={intro ? 1.6 : COVER_TURN * 0.75} opening={opening} />
              </g>
              <TitleChar ch="预" x={px(c.title.x[0])} y={py(c.title.y)} size={size} delay={1} halo />
              <motion.path d={frame} strokeWidth={0.8} className="stroke-peach-gold/70" {...draw(2)} />
              <CoverLettering layout={lettering} delay={2} />
            </g>
          </g>
        </CoverIntro.Provider>
        {/* The inside: the open book's board and page, drawn where the cover lies shut
          (on a spread, as the right half, which the turn mirrors onto the left). */}
        <g ref={backRef} opacity={closing && !single ? 1 : 0}>
          <g transform={single ? undefined : `translate(${geo.width} 0) scale(-1 1)`}>
            <path d={geo.board} className="fill-night stroke-jacaranda/70" />
            {geo.stack.map((d) => (
              <path key={d} d={d} className="stroke-ivory/50" />
            ))}
            <path d={geo.page} className="fill-paper stroke-jacaranda-light/70" />
            <rect x={geo.border.x} y={geo.border.y} width={geo.border.w} height={geo.border.h} className="stroke-jacaranda-light/35" />
          </g>
        </g>
      </g>
    </g>
  );
}

// The bookmark card, in cover units: its width, and how far it stands out of the book.
const CARD_W = 34;
const CARD_RISE = 84;

/**
 * A paper bookmark slipped between the pages, standing out of the book with
 * a tassel on a cord. It is drawn before the board, so the board hides all of
 * it but the part standing out, and it slides out into place. A single page
 * has room above it, so the card stands out of the top edge; a closed spread
 * has room beside it, so the card stands out of the fore-edge, turned on its
 * side with its label read across.
 */
function BookmarkCard({ geo, label }: { geo: Geometry; label: string }) {
  const { x, y, w, h } = geo.cover;
  const side = geo.layout === "spread";
  // The card is drawn standing up from (0, 0), the point where it leaves the book.
  const place = side ? `translate(${x + w} ${y + h * 0.2}) rotate(90)` : `translate(${x + w * 0.72 + CARD_W / 2} ${y})`;
  const half = CARD_W / 2;
  const top = -CARD_RISE;
  const card = `M${-half} 40 V${top + 12} Q0 ${top - 6} ${half} ${top + 12} V40 Z`;
  const hole = { cx: 0, cy: top + 13 };
  // The cord loops over the card's end and hangs down beside it to the tassel.
  const knot = { x: half + 16, y: top + 34 };
  const cord = `M${hole.cx} ${hole.cy} C4 ${top - 22} ${half + 22} ${top - 12} ${knot.x} ${knot.y}`;
  // The tassel hangs straight down the screen, which on the side is along the card.
  const tassel = [-5, -2.5, 0, 2.5, 5]
    .map((d) => (side ? `M${knot.x + 2} ${knot.y} L${knot.x + 26} ${knot.y + d}` : `M${knot.x} ${knot.y + 2} L${knot.x + d} ${knot.y + 26}`))
    .join(" ");
  // Read from the book outwards; on the side the card points right, so the
  // characters are laid from its root and each one is turned upright.
  const chars = side ? [...label].reverse() : [...label];
  const charSize = 13;
  const step = charSize + 2;
  const textTop = top + 28 + (CARD_RISE - 36 - chars.length * step) / 2;

  return (
    <g transform={place}>
      <motion.g
        initial={{ y: CARD_RISE, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: CARD_RISE * 0.6, opacity: 0, transition: { duration: 0.5 } }}
        transition={{ duration: 1.3, delay: 1, ease: [0.22, 1, 0.36, 1] }}
      >
        <path d={card} className="fill-white stroke-jacaranda/60" />
        <path d={`M${4 - half} 40 V${top + 14} Q0 ${top - 1} ${half - 4} ${top + 14} V40`} className="stroke-peach-gold/70" />
        <circle {...hole} r={2.6} className="stroke-jacaranda/60" />
        {chars.map((ch, i) => {
          const cy = textTop + i * step + step / 2;
          return (
            <text
              key={i}
              x={0}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              transform={side ? `rotate(-90 0 ${cy})` : undefined}
              className="fill-jacaranda font-song"
              style={{ fontSize: charSize }}
            >
              {ch}
            </text>
          );
        })}
        <path d={cord} className="stroke-peach-gold" />
        <circle cx={knot.x} cy={knot.y} r={2.4} className="fill-peach-gold stroke-none" />
        <path d={tassel} className="stroke-peach-gold/80" />
      </motion.g>
    </g>
  );
}
