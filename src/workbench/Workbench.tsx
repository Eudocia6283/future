import { useEffect, useRef, useState } from "react";
import { PageSettle } from "../book/InkText";
import type { Reading } from "../oracle/useOracle";
import { CareersTab } from "./CareersTab";
import { DirectionTab } from "./DirectionTab";
import { LearningTab } from "./LearningTab";
import { OverviewTab } from "./OverviewTab";
import { PortraitTab } from "./PortraitTab";
import { PracticeTab } from "./PracticeTab";
import { buildWorkbench, hasReading, type WorkbenchSource } from "./data";

// The reading as a console rather than as a book: the same data the prophecy
// was worked out from, laid out so the whole of it can be taken in at once.
// It is an overlay over the book, not a page of it — the book's language is
// hairlines and wet ink, this one's is panels and figures — and it can be
// opened either on the seeker's own reading or on the bundled demonstration.

const TABS = [
  { id: "overview", latin: "SUMMA", zh: "概览" },
  { id: "portrait", latin: "EFFIGIES", zh: "个人画像" },
  { id: "careers", latin: "VIAE", zh: "职业筛选" },
  { id: "direction", latin: "PROGRESSUS", zh: "发展方向" },
  { id: "learning", latin: "STUDIA", zh: "学习资源" },
  { id: "practice", latin: "OPERA", zh: "实践机会" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function Workbench({
  reading,
  initialSource,
  bookOpen,
  onClose,
  onResume,
}: {
  reading: Reading;
  initialSource: WorkbenchSource;
  /** Whether the book stands open behind the workbench. */
  bookOpen: boolean;
  onClose: () => void;
  onResume: () => void;
}) {
  const [source, setSource] = useState<WorkbenchSource>(initialSource);
  const [tab, setTab] = useState<TabId>("overview");
  const root = useRef<HTMLDivElement>(null);
  const own = hasReading(reading);

  const data = buildWorkbench(reading, source);
  const answered = data.pages.filter((p) => p.answer !== undefined).length;
  const subtitle = [data.portrait?.title ?? "画像尚未绘成", source === "sample" ? "示例数据" : answered ? `本次占卜 · ${answered} 问` : "本次占卜"].join(" · ");

  // Escape closes. The book's own arrow keys are switched off while it is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    root.current?.focus();
  }, []);

  return (
    <div
      ref={root}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="命途工作台"
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[60] overflow-y-auto bg-white text-ink outline-none"
    >
      {/* A faint console grid, fading out towards the edges. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(to_right,rgba(138,99,210,0.055)_1px,transparent_1px),linear-gradient(to_bottom,rgba(138,99,210,0.055)_1px,transparent_1px)] bg-[size:2.4rem_2.4rem]"
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.75)_0%,#ffffff_70%)]" />

      <header className="sticky top-0 z-10 border-b border-jacaranda-light/25 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-3 lg:px-10">
          <div className="flex min-w-0 items-center gap-4">
            <span className="font-serif text-xl tracking-[0.2em] text-ink">E.</span>
            <span className="h-8 w-px bg-jacaranda-light/40" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h1 className="font-song text-[1.05rem] tracking-[0.2em] text-ink">命途工作台</h1>
                <span className="font-serif text-[0.58rem] tracking-[0.3em] text-jacaranda uppercase">Tabula Fatorum</span>
              </div>
              <p className="mt-0.5 truncate font-song text-[0.7rem] tracking-[0.08em] text-ink/50">{subtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center border border-jacaranda-light/35" role="group" aria-label="数据来源">
              {(
                [
                  { id: "reading", label: "本次占卜", enabled: own },
                  { id: "sample", label: "示例数据", enabled: true },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() => s.enabled && setSource(s.id)}
                  disabled={!s.enabled}
                  aria-pressed={source === s.id}
                  title={s.enabled ? undefined : "还没有属于你的占卜，先翻书作答吧"}
                  className={`cursor-pointer px-3 py-1 font-song text-[0.7rem] tracking-[0.18em] transition-colors disabled:cursor-default disabled:opacity-30 ${
                    source === s.id ? "bg-jacaranda text-white" : "text-ink/55 hover:text-jacaranda"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            <button
              onClick={onClose}
              className="group flex cursor-pointer items-center gap-2 font-song text-[0.72rem] tracking-[0.2em] text-ink/65"
            >
              <span className="glow-text-group">{bookOpen ? "返回书中" : "返回封面"}</span>
              <span className="h-px w-6 bg-jacaranda-light" />
            </button>
          </div>
        </div>
      </header>

      <div className="relative mx-auto flex max-w-[1400px] flex-col gap-6 px-5 py-6 lg:flex-row lg:gap-10 lg:px-10 lg:py-8">
        <nav aria-label="工作台页签" className="lg:sticky lg:top-[6.5rem] lg:w-48 lg:shrink-0 lg:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:gap-0 lg:overflow-visible lg:pb-0">
            {TABS.map((t) => {
              const active = tab === t.id;
              return (
                <li key={t.id} className="shrink-0 lg:shrink">
                  <button
                    onClick={() => setTab(t.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex w-full cursor-pointer items-baseline gap-2.5 border-l-2 px-3 py-2 text-left whitespace-nowrap transition-colors ${
                      active ? "border-peach-gold text-jacaranda" : "border-transparent text-ink/55 hover:border-jacaranda-light/40 hover:text-jacaranda"
                    }`}
                  >
                    <span className={`font-serif text-[0.55rem] tracking-[0.25em] uppercase ${active ? "text-peach-gold" : "text-ink/30"}`}>{t.latin}</span>
                    <span className="font-song text-[0.85rem] tracking-[0.18em]">{t.zh}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Keyed on the source, so a page that keeps its own state (the learning
            ticks) reloads for the reading it is now showing. */}
        <main key={source} className="min-w-0 flex-1">
          {/* A console should not wait on the book's page-settling pause. */}
          <PageSettle.Provider value={0.2}>
            {tab === "overview" && <OverviewTab data={data} onResume={onResume} />}
            {tab === "portrait" && <PortraitTab data={data} onResume={onResume} />}
            {tab === "careers" && <CareersTab data={data} onResume={onResume} />}
            {tab === "direction" && <DirectionTab data={data} onResume={onResume} />}
            {tab === "learning" && <LearningTab data={data} source={source} onResume={onResume} />}
            {tab === "practice" && <PracticeTab data={data} onResume={onResume} />}
          </PageSettle.Provider>
        </main>
      </div>

      <footer className="relative mx-auto max-w-[1400px] px-5 pb-10 lg:px-10">
        <p className="border-t border-jacaranda-light/20 pt-4 font-song text-[0.65rem] leading-relaxed tracking-[0.08em] text-ink/35">
          工作台上的每一句话，都出自书里的问答与推演。示例数据用于直接查看成果，不代表任何真实的人；你自己的数据只保存在这台浏览器上。
        </p>
      </footer>
    </div>
  );
}
