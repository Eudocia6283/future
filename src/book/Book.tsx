import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { Reading } from "../oracle/useOracle";
import { portraitSpreads, prophecySpreads, type SpreadContent } from "../prophecy/ProphecySpreads";
import { BookFrame } from "./BookFrame";
import { COVER_TURN, Cover } from "./Cover";
import { boxStyle, roman, type Geometry } from "./geometry";
import { PageSettle } from "./InkText";
import { Leaf } from "./Leaf";
import { EMPTY_DRAFT, OraclePage, SeekerPage, drawingSpread, prologueSpread, type Draft } from "./pages";
import { bookmarkPlace, planSpreads } from "./plan";

// Seconds after mounting before a page's writing begins: once the cover has
// opened, once a leaf has turned, and when a saved reading is reloaded.
const SETTLE_AFTER_OPEN = 0.5;
const SETTLE_AFTER_TURN = 0.75;
const SETTLE_RESTORED = 0.3;
// The pages start to be drawn this far into the cover's turn.
const FRAME_DELAY = COVER_TURN * 0.45;

type Props = {
  geo: Geometry;
  reading: Reading;
  onOpen: () => void;
  onAnswer: (text: string) => void;
  onCorrect: (note: string) => void;
  onAccept: () => void;
  onRetry: () => void;
  onTurn: (view: number | undefined) => void;
  onRestart: () => void;
  /** Lay the reading out as a workbench instead of turning to another spread. */
  onWorkbench: () => void;
  /** An overlay owns the screen, so the book stops listening for arrow keys. */
  paused?: boolean;
};

export function Book({ geo, reading, onOpen, onAnswer, onCorrect, onAccept, onRetry, onTurn, onRestart, onWorkbench, paused = false }: Props) {
  const { phase, pages, portrait, notes, prophecy, error, bookmark } = reading;
  const closed = phase === "closed";
  // "opening" and "closing" while the cover turns; a reading reloaded from storage starts "open".
  const [cover, setCover] = useState<"shut" | "opening" | "open" | "closing">(closed ? "shut" : "open");
  const reduced = useReducedMotion() ?? false;
  const drawFrame = useRef(closed);
  const [settle, setSettle] = useState(SETTLE_RESTORED);
  // The answer being written, kept while the seeker turns back through earlier pages.
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  useEffect(() => setDraft(EMPTY_DRAFT), [pages.length]);

  useEffect(() => {
    if (!closed) return;
    // An open book closes by turning its cover back over; one caught mid-turn simply shuts.
    setCover((c) => (c === "open" && !reduced ? "closing" : "shut"));
    drawFrame.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);

  const open = useCallback(() => {
    if (cover !== "shut") return;
    setCover("opening");
    setSettle(SETTLE_AFTER_OPEN);
    onOpen();
  }, [cover, onOpen]);

  const { plan, home } = useMemo(() => planSpreads(reading), [reading]);
  const chapters = useMemo(() => (prophecy ? prophecySpreads(prophecy, onRestart, onWorkbench) : []), [prophecy, onRestart, onWorkbench]);
  const portraitPages = useMemo(
    () =>
      portrait &&
      portraitSpreads({
        portrait,
        notes: notes ?? [],
        accepted: phase === "divining" || phase === "prophecy",
        redrawing: phase === "portraying",
        error: phase === "portraying" ? error : undefined,
        onCorrect,
        onAccept,
        onRetry,
      }),
    [portrait, notes, phase, error, onCorrect, onAccept, onRetry],
  );

  // Every spread of the reading in order, as planned from where it stands.
  const spreads: SpreadContent[] = useMemo(
    () =>
      plan.map((s) => {
        switch (s.type) {
          case "prologue":
            return prologueSpread({ ready: pages.length > 0, error: pages.length ? undefined : error, onTurn: () => onTurn(1), onRetry });
          case "question": {
            const live = s.index === pages.length - 1 && phase === "pondering";
            return {
              left: <OraclePage page={s.page} index={s.index} />,
              right: (
                <SeekerPage
                  page={s.page}
                  pondering={live}
                  error={live || (s.index === pages.length - 1 && phase === "asking") ? error : undefined}
                  draft={draft}
                  setDraft={setDraft}
                  onAnswer={onAnswer}
                  onRetry={onRetry}
                />
              ),
            };
          }
          case "drawing":
            return drawingSpread({ of: s.of, page: s.page, live: s.live, error: s.live ? error : undefined, onRetry });
          case "portrait":
            return portraitPages![0];
          case "review":
            return portraitPages![1];
          case "chapter":
            return chapters[s.index];
        }
      }),
    [plan, phase, pages, portraitPages, chapters, error, draft, onAnswer, onRetry, onTurn],
  );

  // The book opens at its latest writing, or at a new chapter's first spread;
  // the seeker may turn back from there, and forward again to the end.
  const index = Math.min(Math.max(reading.view ?? home, 0), spreads.length - 1);
  const turnTo = useCallback((i: number) => onTurn(i === home ? undefined : i), [onTurn, home]);
  const spread = spreads[index];

  // A leaf turns whenever another spread comes up once the book is open.
  const [turn, setTurn] = useState<{ id: number; forward: boolean } | null>(null);
  const shown = useRef(index);
  useEffect(() => {
    if (index === shown.current) return;
    const forward = index > shown.current;
    shown.current = index;
    // Closing the book sends it back to its first spread, but by its cover, not a leaf.
    if (cover !== "open" || closed) return;
    setTurn({ id: Date.now(), forward });
    setSettle(SETTLE_AFTER_TURN);
  }, [index, cover, closed]);

  // Arrow keys turn the pages, except while writing an answer.
  useEffect(() => {
    if (cover !== "open" || paused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" && index < spreads.length - 1) turnTo(index + 1);
      if (e.key === "ArrowLeft" && index > 0) turnTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cover, paused, index, spreads.length, turnTo]);

  const spreadLayout = geo.layout === "spread";
  // The closed book is shifted so its cover, not its spine, sits centred.
  const coverCentre = geo.cover.x + geo.cover.w / 2;
  const closedShift = `${((geo.width / 2 - coverCentre) / geo.width) * 100}%`;
  const [leftBox, rightBox] = geo.content;
  const folioX = geo.border.x + geo.border.w / 2;
  const edge = `${(geo.border.x / geo.width) * 100}%`;

  return (
    <motion.div
      className="absolute inset-0"
      initial={false}
      animate={{ x: cover === "shut" || cover === "closing" ? closedShift : "0%" }}
      transition={{ duration: COVER_TURN, ease: [0.65, 0, 0.35, 1] }}
    >
      <svg viewBox={`0 0 ${geo.width} ${geo.height}`} className={`absolute inset-0 size-full overflow-visible ${cover === "shut" ? "animate-breathe" : ""}`} aria-hidden>
        {cover !== "shut" && (
          <BookFrame geo={geo} draw={cover !== "closing" && drawFrame.current} delay={cover === "opening" ? FRAME_DELAY : 0} half={cover === "closing"} />
        )}
        {cover !== "open" && (
          <Cover
            geo={geo}
            opening={cover === "opening"}
            closing={cover === "closing"}
            bookmark={bookmark && bookmarkPlace(bookmark)}
            onOpened={() => setCover("open")}
            onClosed={() => setCover("shut")}
          />
        )}
      </svg>

      {cover === "shut" && (
        <button
          onClick={open}
          aria-label={bookmark ? `从书签处（${bookmarkPlace(bookmark)}）继续` : "翻开预言书"}
          className="absolute cursor-pointer"
          style={boxStyle(geo, geo.cover)}
        />
      )}

      <AnimatePresence mode="wait">
        {cover === "open" && spread && (
          <motion.div
            key={index}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.6, delay: settle * 0.6 } }}
            exit={{ opacity: 0, transition: { duration: 0.3 } }}
          >
            <PageSettle.Provider value={settle}>
              {spreadLayout ? (
                <>
                  <div className="absolute" style={boxStyle(geo, leftBox)}>
                    {spread.left}
                  </div>
                  <div className="absolute" style={boxStyle(geo, rightBox)}>
                    {spread.right}
                  </div>
                </>
              ) : (
                <div className="page-scroll absolute" style={boxStyle(geo, leftBox)}>
                  <div className="[&>*]:h-auto">{spread.left}</div>
                  <div className="my-[1.4em] flex items-center gap-[0.8em]" aria-hidden>
                    <span className="h-px flex-1 bg-jacaranda-light/30" />
                    <span className="size-[0.4em] rotate-45 border border-peach-gold" />
                    <span className="h-px flex-1 bg-jacaranda-light/30" />
                  </div>
                  <div className="[&>*]:h-auto">{spread.right}</div>
                </div>
              )}
              <Folio geo={geo} x={folioX}>
                {roman(index * 2 + 1)}
              </Folio>
              {spreadLayout && (
                <Folio geo={geo} x={geo.width - folioX}>
                  {roman(index * 2 + 2)}
                </Folio>
              )}
              {index > 0 && (
                <PageNav geo={geo} side={{ left: edge }}>
                  <NavButton onClick={() => turnTo(index - 1)}>‹ 前页</NavButton>
                </PageNav>
              )}
              {index < spreads.length - 1 && (
                <PageNav geo={geo} side={{ right: edge }}>
                  {index < home - 1 && <NavButton onClick={() => turnTo(home)}>回到当前 »</NavButton>}
                  <NavButton onClick={() => turnTo(index + 1)}>后页 ›</NavButton>
                </PageNav>
              )}
            </PageSettle.Provider>
          </motion.div>
        )}
      </AnimatePresence>

      {turn && (
        <svg viewBox={`0 0 ${geo.width} ${geo.height}`} className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
          <Leaf key={turn.id} geo={geo} forward={turn.forward} onDone={() => setTurn(null)} />
        </svg>
      )}
    </motion.div>
  );
}

function Folio({ geo, x, children }: { geo: Geometry; x: number; children: ReactNode }) {
  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2 font-serif text-[0.6em] tracking-[0.3em] text-jacaranda-light"
      style={{ left: `${(x / geo.width) * 100}%`, top: `${(geo.folioY / geo.height) * 100}%` }}
    >
      {children}
    </span>
  );
}

/** Page-turning links in a bottom corner, on the folio's line. */
function PageNav({ geo, side, children }: { geo: Geometry; side: CSSProperties; children: ReactNode }) {
  return (
    <div className="absolute flex -translate-y-1/2 gap-[1.6em]" style={{ ...side, top: `${(geo.folioY / geo.height) * 100}%` }}>
      {children}
    </div>
  );
}

function NavButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className="group cursor-pointer font-song text-[0.72em] tracking-[0.3em] text-jacaranda">
      <span className="glow-text-group">{children}</span>
    </button>
  );
}
