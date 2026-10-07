import type { Bookmark, Page } from "../oracle/useOracle";
import { cn } from "../../shared/oracle";

/** The prophecy's chapters after the portrait, in spreads. */
export const PROPHECY_SPREADS = 2;

/**
 * What stands on each spread of a reading, in order:
 *   prologue  · the book waking
 *   question  · one per question, the last one live
 *   drawing   · the book's closing words beside its sigil, while it draws the
 *               portrait and, once that is accepted, the prophecy
 *   portrait  · the word cloud and the written portrait
 *   review    · what the book is unsure of, corrections, and the way on
 *   chapter   · the prophecy's chapters
 */
export type SpreadPlan =
  | { type: "prologue" }
  | { type: "question"; page: Page; index: number }
  | { type: "drawing"; of: "portrait" | "prophecy"; page?: Page; live: boolean }
  | { type: "portrait" }
  | { type: "review" }
  | { type: "chapter"; index: number };

export function planSpreads(r: Pick<Bookmark, "phase" | "pages" | "portrait" | "prophecy">) {
  const { phase, pages, portrait, prophecy } = r;
  const plan: SpreadPlan[] = [{ type: "prologue" }];
  pages.forEach((page, index) => {
    if (!page.question.ready) plan.push({ type: "question", page, index });
    else plan.push({ type: "drawing", of: "portrait", page, live: phase === "portraying" && !portrait });
  });
  const portraitAt = plan.length;
  if (portrait) plan.push({ type: "portrait" }, { type: "review" });
  if (phase === "divining" || phase === "prophecy") plan.push({ type: "drawing", of: "prophecy", live: phase === "divining" });
  const chaptersAt = plan.length;
  if (phase === "prophecy" && prophecy) plan.push(...Array.from({ length: PROPHECY_SPREADS }, (_, index) => ({ type: "chapter" as const, index })));

  // The book opens at its latest writing: a new portrait or prophecy at its first spread,
  // a portrait being drawn again beside the corrections that asked for it.
  const home = phase === "prophecy" ? chaptersAt : phase === "portrait" ? portraitAt : phase === "portraying" && portrait ? portraitAt + 1 : plan.length - 1;
  return { plan, home };
}

/** Where a spread lies, for a bookmark's label: 序章, 第三问, 画像, 推演 or 预言. */
export function spreadPlace(s: SpreadPlan) {
  switch (s.type) {
    case "prologue":
      return "序章";
    case "question":
      return `第${cn(s.index + 1)}问`;
    case "drawing":
      return s.of === "portrait" ? "描绘" : "推演";
    case "portrait":
    case "review":
      return "画像";
    case "chapter":
      return "预言";
  }
}

export function bookmarkPlace(b: Bookmark) {
  const { plan, home } = planSpreads(b);
  return spreadPlace(plan[Math.min(Math.max(b.view ?? home, 0), plan.length - 1)]);
}
