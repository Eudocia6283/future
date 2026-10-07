import { useCallback, useEffect, useRef, useState } from "react";
import {
  MAX_QUESTIONS,
  type Exchange,
  type OracleQuestion,
  type OracleRequest,
  type OracleResponse,
  type Portrait,
  type Profile,
  type Prophecy,
} from "../../shared/oracle";

/**
 * Where the reading stands:
 *   closed     · the book lies shut, waiting to be opened
 *   asking     · a question is on the page, waiting for the seeker's answer
 *   pondering  · the answer is written and the book is thinking
 *   portraying · the book has heard enough and is drawing the seeker's portrait
 *   portrait   · the portrait is drawn, for the seeker to correct or accept
 *   divining   · the portrait is accepted and the book is working out the prophecy
 *   prophecy   · the prophecy is written
 */
export type Phase = "closed" | "asking" | "pondering" | "portraying" | "portrait" | "divining" | "prophecy";

/** One page of the reading: the book's question, and the answer once given. */
export type Page = { question: OracleQuestion; answer?: string };

export type Reading = {
  phase: Phase;
  pages: Page[];
  portrait?: Portrait;
  /** The seeker's corrections to the portrait, in the order given. */
  notes?: string[];
  prophecy?: Prophecy;
  /** Set when the last request failed; `retry` repeats it. */
  error?: string;
  /** The server has no API key and is replaying its scripted reading. */
  mock?: boolean;
  /** The spread the seeker has turned to; unset, the book shows its latest writing. */
  view?: number;
  /** A reading in progress, kept while the book is closed on it. */
  bookmark?: Bookmark;
};

export type Bookmark = Omit<Reading, "bookmark" | "error">;

const STORAGE_KEY = "prophecy-book/v2";
// The spreads where the book is drawing stay at least this long, however quickly the answer comes back.
const MIN_DRAWING = 4200;
const CLOSED: Reading = { phase: "closed", pages: [] };

async function consult<T>(request: OracleRequest): Promise<{ data: T; mock: boolean }> {
  let body: OracleResponse<T>;
  try {
    const res = await fetch("/api/oracle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });
    body = await res.json();
  } catch {
    throw new Error("无法触及预言之源，请检查本地服务是否在运行");
  }
  if (!body.ok) throw new Error(body.error);
  return body;
}

const atLeast = <T,>(ms: number, p: Promise<T>) => Promise.all([p, new Promise((r) => setTimeout(r, ms))]).then(([v]) => v);

/** What the book has said and heard so far, as the server expects it. */
const historyOf = (pages: Page[]): Exchange[] =>
  pages
    .filter((p) => p.answer !== undefined)
    .map((p) => ({ question: [p.question.reply, p.question.question].filter(Boolean).join("\n"), answer: p.answer! }));

/** The portrait's entries as the book last wrote them down. */
export const profileOf = (pages: Page[]): Profile => pages[pages.length - 1]?.question.profile ?? {};

const BUSY: Phase[] = ["pondering", "portraying", "divining"];

function load(): Reading {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Reading | null;
    if (!saved?.pages) return CLOSED;
    // A reading closed mid-request resumes with a prompt to try again.
    if (BUSY.includes(saved.phase)) return { ...saved, error: saved.error ?? "上次的推演被打断了" };
    return saved;
  } catch {
    return CLOSED;
  }
}

export function useOracle() {
  const [reading, setReading] = useState<Reading>(load);
  const readingRef = useRef(reading);
  readingRef.current = reading;
  // Requests are numbered so a reply that lands after the book was closed is dropped.
  const requestId = useRef(0);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reading));
  }, [reading]);

  /** Work out the prophecy from an accepted portrait. */
  const divine = useCallback(async () => {
    const id = ++requestId.current;
    const { portrait, pages } = readingRef.current;
    if (!portrait) return;
    setReading((r) => ({ ...r, phase: "divining", error: undefined, view: undefined, bookmark: undefined }));
    try {
      const { data, mock } = await atLeast(MIN_DRAWING, consult<Prophecy>({ mode: "prophesy", portrait, profile: profileOf(pages) }));
      if (id === requestId.current) setReading((r) => ({ ...r, phase: "prophecy", prophecy: data, mock, view: undefined }));
    } catch (e) {
      if (id === requestId.current) setReading((r) => ({ ...r, error: (e as Error).message }));
    }
  }, []);

  /** Draw the portrait from everything answered, taking in any corrections. */
  const portray = useCallback(async (pages: Page[], notes: string[]) => {
    const id = ++requestId.current;
    setReading((r) => ({ ...r, phase: "portraying", pages, notes, prophecy: undefined, error: undefined, view: undefined, bookmark: undefined }));
    try {
      const { data, mock } = await atLeast(MIN_DRAWING, consult<Portrait>({ mode: "portray", history: historyOf(pages), profile: profileOf(pages), notes }));
      if (id === requestId.current) setReading((r) => ({ ...r, phase: "portrait", portrait: data, mock, view: undefined }));
    } catch (e) {
      if (id === requestId.current) setReading((r) => ({ ...r, error: (e as Error).message }));
    }
  }, []);

  /** Ask the book for its next page, given everything answered so far. */
  const ask = useCallback(
    async (pages: Page[]) => {
      const id = ++requestId.current;
      setReading((r) => ({ ...r, phase: "pondering", pages, error: undefined, view: undefined, bookmark: undefined }));
      try {
        const asked = pages.filter((p) => p.answer !== undefined).map((p) => p.question.target);
        const { data, mock } = await consult<OracleQuestion>({ mode: "ask", history: historyOf(pages), profile: profileOf(pages), asked });
        if (id !== requestId.current) return;
        const next = [...pages, { question: data }];
        if (data.ready || historyOf(pages).length >= MAX_QUESTIONS) {
          setReading((r) => ({ ...r, mock }));
          return portray(next, []);
        }
        // The first question waits on the next page while the prologue stays open, for the seeker to turn to.
        setReading((r) => ({ ...r, phase: "asking", pages: next, mock, view: pages.length ? undefined : 0 }));
      } catch (e) {
        if (id === requestId.current) setReading((r) => ({ ...r, error: (e as Error).message }));
      }
    },
    [portray],
  );

  /** Open the book: at its bookmark, taking up any request that closing it cut short, or afresh. */
  const open = useCallback(() => {
    const { bookmark } = readingRef.current;
    if (!bookmark) return ask([]);
    setReading({ ...bookmark, bookmark: undefined });
    if (bookmark.phase === "pondering") ask(bookmark.pages);
    else if (bookmark.phase === "portraying") portray(bookmark.pages, bookmark.notes ?? []);
    else if (bookmark.phase === "divining") divine();
  }, [ask, portray, divine]);

  const answer = useCallback(
    (text: string) => {
      const { pages } = readingRef.current;
      const last = pages[pages.length - 1];
      if (!last || last.answer !== undefined) return;
      ask([...pages.slice(0, -1), { ...last, answer: text }]);
    },
    [ask],
  );

  /** Put the portrait right: it is drawn again with the correction taken in. */
  const correct = useCallback(
    (note: string) => {
      const { pages, notes = [], phase } = readingRef.current;
      if (phase !== "portrait") return;
      portray(pages, [...notes, note]);
    },
    [portray],
  );

  const retry = useCallback(() => {
    const { phase, pages, notes = [] } = readingRef.current;
    if (phase === "divining") divine();
    else if (phase === "portraying") portray(pages, notes);
    else ask(pages);
  }, [ask, portray, divine]);

  /** Turn to a spread; `undefined` returns to the latest. */
  const turnTo = useCallback((view: number | undefined) => setReading((r) => ({ ...r, view })), []);

  /** Close the book, leaving a bookmark in any reading under way. */
  const close = useCallback(() => {
    requestId.current++;
    setReading(({ bookmark, error, ...r }) =>
      r.phase === "closed" || !r.pages.length ? { ...CLOSED, bookmark } : { ...CLOSED, mock: r.mock, bookmark: r },
    );
  }, []);

  /** Close the book and take out its bookmark, so the next reading starts afresh. */
  const restart = useCallback(() => {
    requestId.current++;
    setReading(CLOSED);
  }, []);

  return { reading, open, answer, correct, accept: divine, retry, turnTo, close, restart };
}
