import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Book } from "./book/Book";
import { SINGLE, SPREAD, type Geometry } from "./book/geometry";
import { bookmarkPlace } from "./book/plan";
import { Fireflies, type FirefliesRef } from "./components/Fireflies";
import { MagicCircle } from "./components/MagicCircle";
import { useTapPulse } from "./hooks/useTapPulse";
import { useOracle } from "./oracle/useOracle";

/** An open spread needs a wide, landscape window; anything narrower reads one page at a time. */
function useGeometry(): Geometry {
  const pick = () => (window.innerWidth >= 760 && window.innerWidth / window.innerHeight >= 0.95 ? SPREAD : SINGLE);
  const [geo, setGeo] = useState(pick);
  useEffect(() => {
    const onResize = () => setGeo(pick());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return geo;
}

// The book fills the window short of the header and footer, at its own
// proportions. Text inside is sized in `em` off a font size that scales
// with the book's width.
const BOOK_SIZE: Record<Geometry["layout"], { width: string; font: string }> = {
  spread: { width: "min(94vw, 1180px, calc((100svh - 140px) * 1000 / 660))", font: "1.45cqw" },
  single: { width: "min(94vw, 560px, calc((100svh - 110px) * 560 / 820))", font: "3.3cqw" },
};

export default function App() {
  const geo = useGeometry();
  const { reading, open, answer, correct, accept, retry, turnTo, close, restart } = useOracle();
  const firefliesRef = useRef<FirefliesRef>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleId = useRef(0);
  const thinking = ["pondering", "portraying", "divining"].includes(reading.phase) && !reading.error;

  // While the book thinks, the fireflies drift in towards it.
  useEffect(() => {
    const rect = bookRef.current?.getBoundingClientRect();
    firefliesRef.current?.gather(thinking && rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : null);
  }, [thinking]);

  const spawnRipple = useCallback((e: React.PointerEvent) => {
    const id = rippleId.current++;
    setRipples((prev) => [...prev, { id, x: e.clientX, y: e.clientY }]);
    setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 1000);
    firefliesRef.current?.burst(e.clientX, e.clientY);
  }, []);

  const size = BOOK_SIZE[geo.layout];
  const closed = reading.phase === "closed";

  return (
    <div
      onPointerDown={spawnRipple}
      className="relative flex h-svh w-full flex-col items-center justify-center overflow-hidden bg-white text-ink selection:bg-jacaranda selection:text-white"
    >
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_center,rgba(245,245,250,0.6)_0%,#ffffff_60%)]" />

      <MagicCircle thinking={thinking} />

      <Fireflies ref={firefliesRef} />

      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        <AnimatePresence>
          {ripples.map((r) => (
            <motion.div
              key={r.id}
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 2, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute size-24 rounded-full border border-jacaranda/20 bg-jacaranda-light/5 shadow-[inset_0_0_20px_rgba(138,99,210,0.1)] backdrop-blur-3xl backdrop-saturate-200"
              style={{ left: r.x - 48, top: r.y - 48 }}
            />
          ))}
        </AnimatePresence>
      </div>

      <header className="fixed top-0 right-0 left-0 z-30 flex items-start justify-between p-5 md:p-8">
        <Logo />
        {/* Closing the book leaves a bookmark in it; taking the bookmark out starts afresh. */}
        <AnimatePresence mode="wait">
          {(!closed || reading.bookmark) && (
            <motion.button
              key={closed ? "unmark" : "close"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 1.5, duration: 1 } }}
              exit={{ opacity: 0, transition: { duration: 0.3 } }}
              onClick={closed ? restart : close}
              title={closed ? "丢弃这次占卜的进度，下次翻开时重新开始" : "夹上书签合上书，下次翻开时从这一页继续"}
              className="group flex cursor-pointer items-center gap-3 pt-3 font-song text-sm tracking-[0.3em] text-ink/70"
            >
              <span className="h-px w-6 bg-jacaranda-light" />
              <span className="glow-text-group">{closed ? "取下书签" : "合上书"}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </header>

      <main className="@container relative z-10" style={{ width: size.width }}>
        <h1 className="sr-only">预言书：人工智能专业的职业生涯规划</h1>
        <div
          ref={bookRef}
          className="relative w-full"
          style={{ aspectRatio: `${geo.width} / ${geo.height}`, fontSize: size.font } as CSSProperties}
        >
          <Book
            key={geo.layout}
            geo={geo}
            reading={reading}
            onOpen={open}
            onAnswer={answer}
            onCorrect={correct}
            onAccept={accept}
            onRetry={retry}
            onTurn={turnTo}
            onRestart={restart}
          />
        </div>
      </main>

      <AnimatePresence>
        {closed && (
          <motion.p
            key={reading.bookmark ? "bookmark" : "fresh"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { delay: 2.6, duration: 1.2 } }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            className="pointer-events-none fixed bottom-[6svh] z-10 flex items-center gap-5"
          >
            <span className="h-px w-8 bg-jacaranda-light" />
            <span className="font-song text-xs tracking-[0.4em] text-jacaranda">
              {reading.bookmark ? `书签夹在${bookmarkPlace(reading.bookmark)} · 轻触书封继续` : "轻触书封 · 唤醒预言书"}
            </span>
            <span className="h-px w-8 bg-jacaranda-light" />
          </motion.p>
        )}
      </AnimatePresence>

      {reading.mock && (
        <p className="fixed right-5 bottom-4 z-30 font-sans text-[0.6rem] tracking-[0.3em] text-ink/35">MOCK · 演示模式，未配置 GEMINI_API_KEY</p>
      )}
    </div>
  );
}

/** Eudocia's mark from the Atelier: "E." in Cinzel, underlined in gold on hover or tap. */
function Logo() {
  const { handleTap, pulseProps } = useTapPulse<HTMLAnchorElement>();
  return (
    <a
      href="/"
      aria-label="Eudocia"
      {...pulseProps}
      onClick={handleTap}
      className="glow-text group relative pt-1 font-serif text-2xl tracking-[0.2em] text-ink"
    >
      E.
      <span className="absolute -bottom-2 left-0 h-px w-0 bg-peach-gold opacity-0 shadow-[0_0_8px_#E5BEA5] transition-all duration-[600ms] ease-out group-hover:w-full group-hover:opacity-100 group-data-pulse:w-full group-data-pulse:opacity-100" />
    </a>
  );
}
