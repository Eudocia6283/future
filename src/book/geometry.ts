// The book is drawn in SVG user units; its pages' HTML content is laid over
// the drawing in boxes given as percentages of the same viewBox.

export type Box = { x: number; y: number; w: number; h: number };

export type Geometry = {
  layout: "spread" | "single";
  width: number;
  height: number;
  /** The x the leaves turn about. */
  spine: number;
  /** Outline of one page, spine side first; the spread mirrors it for the right page. */
  page: string;
  /** Edges of the pages beneath, peeking out along the fore-edge. */
  stack: string[];
  /** The hard cover behind the pages. */
  board: string;
  /** Gutter shading either side of the spine. */
  gutter: string[];
  /** The ruled border around the text of one page. */
  border: Box;
  /** Where the folio number sits, below the border. */
  folioY: number;
  /** Closed front cover. */
  cover: Box;
  /** Text boxes: `[left, right]` on a spread, `[page]` on a single page. */
  content: Box[];
};

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

/** An open book seen from above: two pages curving down into the spine. */
export const SPREAD: Geometry = {
  layout: "spread",
  width: 1000,
  height: 660,
  spine: 500,
  page: "M500 58 C430 42 260 34 44 40 L44 616 C260 610 430 616 500 632 Z",
  stack: range(3).map((i) => `M${44 - 5 * i} ${40 + 3 * i} L${44 - 5 * i} ${616 + 3 * i} C260 ${610 + 3 * i} 430 ${616 + 3 * i} 500 ${632 + 2 * i}`),
  board: "M500 646 L40 646 Q22 646 22 630 L22 40 Q22 24 40 24 L500 24",
  gutter: ["M488 62 C493 250 493 440 488 628", "M476 66 C483 250 483 440 476 624"],
  border: { x: 76, y: 72, w: 396, h: 506 },
  folioY: 602,
  cover: { x: 500, y: 24, w: 476, h: 622 },
  content: [
    { x: 100, y: 98, w: 350, h: 460 },
    { x: 550, y: 98, w: 350, h: 460 },
  ],
};

/** A single page for narrow screens, bound along its left edge. */
export const SINGLE: Geometry = {
  layout: "single",
  width: 560,
  height: 820,
  spine: 40,
  page: "M40 34 C200 26 380 24 526 30 L526 790 C380 794 200 792 40 798 Z",
  stack: range(3).map((i) => `M${40} ${34 - 2 * i} C200 ${26 - 2 * i} 380 ${24 - 2 * i} ${526 + 4 * i} ${30 + i} L${526 + 4 * i} ${790 + i}`),
  board: "M40 16 L528 16 Q546 16 546 32 L546 800 Q546 816 528 816 L40 816",
  gutter: ["M52 38 C56 300 56 540 52 794"],
  border: { x: 70, y: 62, w: 430, h: 690 },
  folioY: 776,
  cover: { x: 40, y: 16, w: 506, h: 800 },
  content: [{ x: 92, y: 88, w: 386, h: 640 }],
};

/** CSS placing an HTML box over the drawing. */
export function boxStyle(g: Geometry, b: Box) {
  return {
    left: `${(b.x / g.width) * 100}%`,
    top: `${(b.y / g.height) * 100}%`,
    width: `${(b.w / g.width) * 100}%`,
    height: `${(b.h / g.height) * 100}%`,
  };
}

/**
 * A leaf turning about the spine, as an SVG matrix. `t` runs 0 → 1 as the
 * leaf travels from right to left: it foreshortens through edge-on at 0.5
 * while its outer edge lifts by `lift` of its distance from the spine.
 */
export function turnMatrix(t: number, pivot: number, lift = 0.06) {
  const sx = Math.cos(Math.PI * t);
  const b = -lift * Math.sin(Math.PI * t);
  return `matrix(${sx.toFixed(4)} ${b.toFixed(4)} 0 1 ${(pivot - pivot * sx).toFixed(2)} ${(-b * pivot).toFixed(2)})`;
}

/** Roman numerals for folio numbers. */
export function roman(n: number) {
  const table: [number, string][] = [
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let out = "";
  for (const [v, s] of table) {
    while (n >= v) {
      out += s;
      n -= v;
    }
  }
  return out;
}
