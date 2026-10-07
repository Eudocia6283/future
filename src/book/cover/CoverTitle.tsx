import { motion } from "motion/react";
import { useContext } from "react";
import { CoverIntro } from "./intro";

const surface = (delay: number, intro: boolean) => ({
  initial: intro ? { opacity: 0, filter: "blur(6px)" } : false,
  animate: { opacity: 1, filter: "blur(0px)" },
  transition: { duration: 1.4, delay, ease: "easeOut" as const },
});

/**
 * One great hollow character of the title, centred on (x, y): an ivory
 * outline on the cover's own colour, with a gold outline set a little off it
 * as if misprinted. With `halo` it is ringed by a margin of the cover's
 * colour, so lines passing beneath it break clear of its strokes, as the
 * lines of the eye do where they cross.
 */
export function TitleChar({ ch, x, y, size, delay = 0, halo = false }: { ch: string; x: number; y: number; size: number; delay?: number; halo?: boolean }) {
  const text = { x, y, textAnchor: "middle" as const, dominantBaseline: "central" as const };
  const shift = size * 0.022;
  return (
    <motion.g className="font-song" style={{ fontSize: size, fontWeight: 900 }} {...surface(delay, useContext(CoverIntro))}>
      {halo && (
        <text {...text} strokeWidth={8} strokeLinejoin="round" className="fill-night stroke-night">
          {ch}
        </text>
      )}
      <text {...text} dx={shift} dy={shift} fill="none" strokeWidth={1} className="stroke-peach-gold/80">
        {ch}
      </text>
      <text {...text} strokeWidth={1.3} strokeLinejoin="round" className="fill-night stroke-ivory">
        {ch}
      </text>
    </motion.g>
  );
}

export type LetteringLayout = {
  /** The line of small capitals along the top, and the y of the subtitle along the bottom. */
  top: [number, number];
  bottom: [number, number];
  /** The Latin title, set down the fore-edge: its x and the y of its middle. */
  fore: [number, number];
  /** Size of the small capitals. */
  size: number;
};

/**
 * The cover's small lettering, like a title page's: a running line of small
 * capitals at the top, the Latin title upright down the fore-edge, and the
 * book's subject along the bottom.
 */
export function CoverLettering({ layout, delay = 0 }: { layout: LetteringLayout; delay?: number }) {
  const { top, bottom, fore, size } = layout;
  const centred = { textAnchor: "middle" as const, dominantBaseline: "central" as const };
  const diamond = (cx: number, cy: number) => `M${cx} ${cy - 3.5}L${cx + 3.5} ${cy}L${cx} ${cy + 3.5}L${cx - 3.5} ${cy}Z`;
  const gap = size * 7.5;
  // Letter-spacing trails each word, so centred words are nudged right by half of it.
  const track = size * 0.4;
  return (
    <motion.g {...surface(delay, useContext(CoverIntro))}>
      <g className="font-serif fill-ivory/70" style={{ fontSize: size, letterSpacing: track }}>
        <text x={top[0] - gap * 1.6} y={top[1]} dx={track / 2} {...centred}>
          N° I
        </text>
        <text x={top[0]} y={top[1]} dx={track / 2} {...centred}>
          ORACVLVM
        </text>
        <text x={top[0] + gap * 1.6} y={top[1]} dx={track / 2} {...centred}>
          MMXXVI
        </text>
      </g>
      <path d={`${diamond(top[0] - gap * 0.92, top[1])}${diamond(top[0] + gap * 0.92, top[1])}`} fill="none" className="stroke-peach-gold" />
      <text
        transform={`translate(${fore[0]} ${fore[1]}) rotate(90)`}
        {...centred}
        className="font-serif fill-jacaranda-light"
        style={{ fontSize: size * 1.05, letterSpacing: size * 0.35 }}
      >
        LIBER PROPHETIAE
      </text>
      <text x={bottom[0]} y={bottom[1]} dx={size * 0.3} {...centred} className="font-song fill-ivory/60" style={{ fontSize: size * 1.05, letterSpacing: size * 0.6 }}>
        人工智能 · 生涯占卜
      </text>
    </motion.g>
  );
}
