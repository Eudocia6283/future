import { useId } from "react";

/** A unique id usable in an SVG `url(#…)` reference, which React's own ids are not. */
export function useSvgId(prefix: string) {
  return prefix + useId().replace(/[^\w-]/g, "");
}
