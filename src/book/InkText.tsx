import { createContext, useContext } from "react";

/** Seconds after a page's content mounts before its writing begins. */
export const PageSettle = createContext(0.8);

// Seconds between characters, and the most any one passage may take.
const CHAR_STEP = 0.035;
const MAX_WRITING = 2.6;

const stepFor = (text: string) => Math.min(CHAR_STEP, MAX_WRITING / Math.max(1, [...text].length));

/** How long `text` takes to write, so the next passage can follow it. */
export function inkDuration(text: string) {
  return [...text].length * stepFor(text);
}

/**
 * Text written onto the page one character at a time (`.ink-char` in
 * index.css). `after` delays it, in seconds past the page settling, so
 * passages can be written in turn.
 */
export function InkText({ text, after = 0, className = "" }: { text: string; after?: number; className?: string }) {
  const settle = useContext(PageSettle);
  const step = stepFor(text);
  return (
    <span className={className} aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} aria-hidden className="ink-char" style={{ animationDelay: `${(settle + after + i * step).toFixed(3)}s` }}>
          {ch}
        </span>
      ))}
    </span>
  );
}
