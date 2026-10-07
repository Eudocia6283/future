import { Feather } from "lucide-react";
import { motion } from "motion/react";
import { useContext, useEffect, useRef, type ReactNode } from "react";
import { DIMENSIONS, DIMENSION_LABELS, FACETS, cn, dimensionCoverage, type Profile } from "../../shared/oracle";
import type { Page } from "../oracle/useOracle";
import { roman } from "./geometry";
import { InkText, PageSettle, inkDuration } from "./InkText";
import { Sigil } from "./Sigil";

/** A page's heading: a Latin rubric in small capitals over the Chinese title, with a gold rule between. */
export function PageHeading({ latin, children }: { latin: string; children: ReactNode }) {
  return (
    <header className="mb-[1.4em] flex flex-col items-start">
      <span className="font-serif text-[0.62em] tracking-[0.35em] text-jacaranda">{latin}</span>
      <span className="my-[0.6em] h-px w-[2.6em] bg-peach-gold" />
      <h2 className="font-song text-[1.05em] tracking-[0.2em] text-ink/85">{children}</h2>
    </header>
  );
}

/** Three dots pulsing in turn beside a line of text, while the book thinks. */
export function Pondering({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-[0.8em] font-song text-[0.85em] tracking-[0.15em] text-jacaranda/80" role="status">
      <span className="flex gap-[0.35em]">
        {[0, 1, 2].map((i) => (
          <span key={i} className="size-[0.35em] rotate-45 animate-ponder bg-peach-gold" style={{ animationDelay: `${i * 0.25}s` }} />
        ))}
      </span>
      {label}
    </p>
  );
}

export function ErrorNote({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-start gap-[0.8em] font-song" role="alert">
      <p className="text-[0.95em] tracking-[0.1em] text-rose">星辰暂时沉默了。</p>
      <p className="text-[0.75em] leading-relaxed break-all text-ink/50">{message}</p>
      <button onClick={onRetry} className="group mt-[0.4em] flex cursor-pointer items-center gap-[0.6em] text-[0.85em] tracking-[0.2em]">
        <span className="h-px w-[1.6em] bg-jacaranda-light" />
        <span className="glow-text-group">再试一次</span>
      </button>
    </div>
  );
}

/**
 * How much the book knows of the seeker, dimension by dimension: a diamond
 * that fills from the bottom as its entries become known, gilded once full.
 */
function Coverage({ profile, current }: { profile: Profile; current: (typeof DIMENSIONS)[number] }) {
  return (
    <div className="mt-auto pt-[1.2em]">
      <p className="mb-[0.7em] font-song text-[0.62em] tracking-[0.3em] text-ink/40">预言书对你的了解</p>
      <ul className="flex flex-wrap gap-x-[1em] gap-y-[0.5em]">
        {DIMENSIONS.map((d) => {
          const known = dimensionCoverage(profile, d);
          const full = known >= 1;
          return (
            <li
              key={d}
              title={`${DIMENSION_LABELS[d]}：已了解 ${Math.round(known * 100)}%`}
              className={`flex items-center gap-[0.45em] font-song text-[0.62em] tracking-[0.1em] ${full ? "text-ink/70" : d === current ? "text-jacaranda" : known > 0 ? "text-ink/50" : "text-ink/30"}`}
            >
              <span className={`relative size-[0.6em] shrink-0 rotate-45 overflow-hidden border ${full ? "border-peach-gold" : d === current ? "border-jacaranda" : "border-jacaranda-light/60"}`}>
                {/* Filled along the diamond's diagonal, so it rises from its lower point. */}
                <span
                  className={`absolute -inset-1/2 transition-transform duration-1000 ${full ? "bg-peach-gold" : "bg-jacaranda-light/70"}`}
                  style={{ transform: `rotate(-45deg) translateY(${(1 - known) * 100}%)` }}
                />
              </span>
              {DIMENSION_LABELS[d]}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** The book's side of a page: its reply to the last answer, then the next question. */
export function OraclePage({ page, index }: { page: Page; index: number }) {
  const { reply, question, target, profile } = page.question;
  return (
    <div className="flex h-full flex-col">
      <PageHeading latin={`QUAESTIO ${roman(index + 1)}`}>
        第{cn(index + 1)}问 · {FACETS[target].label}
      </PageHeading>
      <div className="page-scroll min-h-0 pb-[1em]">
        {reply && (
          <p className="mb-[1.2em] font-song text-[0.88em] leading-[2] tracking-[0.05em] [--ink-dry:rgb(43_38_51/0.55)]">
            <InkText text={reply} />
          </p>
        )}
        <p className="font-song text-[1.2em] leading-[1.9] tracking-[0.05em]">
          <InkText text={question} after={reply ? inkDuration(reply) + 0.3 : 0} />
        </p>
      </div>
      <Coverage profile={profile} current={FACETS[target].dim} />
    </div>
  );
}

/** An answer being written: what is picked or marked on the scale, and any words besides. */
export type Draft = { text: string; picks: string[]; scale?: number };
export const EMPTY_DRAFT: Draft = { text: "", picks: [] };

/** The draft as the seeker's answer, in words the book can read back. */
function answerOf(draft: Draft, question: Page["question"]) {
  const text = draft.text.trim();
  const parts: string[] = [];
  if (question.kind === "multi" && draft.picks.length) parts.push(draft.picks.join("、"));
  if (question.kind === "scale" && draft.scale && question.scale) {
    parts.push(`${draft.scale} / 5（1 为「${question.scale.low}」，5 为「${question.scale.high}」）`);
  }
  if (text) parts.push(text);
  return parts.join("；");
}

/** A textarea on a single ruled line that grows as the seeker writes. */
function Quill({
  disabled,
  canSubmit,
  onSubmit,
  text,
  setText,
  placeholder,
}: {
  disabled: boolean;
  canSubmit: boolean;
  onSubmit: () => void;
  text: string;
  setText: (s: string) => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [text]);

  const submit = () => {
    if (canSubmit && !disabled) onSubmit();
  };

  return (
    <div className="mt-[1.2em]">
      <div className="flex items-end gap-[0.6em] border-b border-jacaranda-light/50 pb-[0.3em] transition-colors focus-within:border-jacaranda">
        <textarea
          ref={ref}
          data-quill
          rows={1}
          value={text}
          maxLength={600}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={placeholder}
          aria-label="你的回答"
          className="max-h-[8em] min-h-[1.8em] flex-1 resize-none bg-transparent font-song text-[0.95em] leading-[1.8] tracking-[0.05em] text-ink outline-none placeholder:text-ink/30"
        />
        <button
          onClick={submit}
          disabled={disabled || !canSubmit}
          className="group flex shrink-0 cursor-pointer items-center gap-[0.35em] pb-[0.35em] font-song text-[0.8em] tracking-[0.2em] text-jacaranda transition-opacity disabled:cursor-default disabled:opacity-30"
        >
          <Feather className="size-[1.1em]" strokeWidth={1.25} />
          <span className="glow-text-group">落笔</span>
        </button>
      </div>
      <p className="mt-[0.6em] font-sans text-[0.55em] tracking-[0.15em] text-ink/35">Enter 落笔 · Shift + Enter 换行</p>
    </div>
  );
}

const optionList = {
  initial: "hidden",
  animate: "visible",
  variants: { visible: { transition: { staggerChildren: 0.1, delayChildren: 1.2 } } },
} as const;
const optionItem = { hidden: { opacity: 0, x: -8 }, visible: { opacity: 1, x: 0, transition: { duration: 0.6 } } };

/** A diamond marker, gilded when chosen, and warming on hover. */
function Diamond({ on, size = "0.45em" }: { on: boolean; size?: string }) {
  return (
    <span
      style={{ width: size, height: size }}
      className={`shrink-0 rotate-45 border transition-all ${on ? "border-peach-gold bg-peach-gold" : "border-jacaranda-light group-hover:border-peach-gold group-hover:bg-peach-gold/40"}`}
    />
  );
}

/** Five diamonds on a line between the scale's two ends; those up to the mark are gilded. */
function Scale({ value, low, high, onChange }: { value?: number; low: string; high: string; onChange: (v: number) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 1.2, duration: 0.8 } }} className="pt-[0.4em]">
      <div className="relative flex items-center justify-between" role="radiogroup" aria-label={`从「${low}」到「${high}」`}>
        <span className="absolute inset-x-[0.8em] top-1/2 h-px bg-jacaranda-light/40" />
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            role="radio"
            aria-checked={value === v}
            aria-label={String(v)}
            onClick={() => onChange(v)}
            className="group relative flex size-[1.6em] cursor-pointer items-center justify-center"
          >
            <span className="absolute inset-[0.3em] rounded-full bg-paper" />
            <span className="relative flex">
              <Diamond on={value !== undefined && v <= value} size={v === value ? "0.8em" : "0.55em"} />
            </span>
          </button>
        ))}
      </div>
      <div className="mt-[0.5em] flex justify-between font-song text-[0.68em] tracking-[0.1em] text-ink/50">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </motion.div>
  );
}

/**
 * The seeker's side: the answers to pick from and a line to write on, or
 * their answer once given. A single option is picked into the line, where
 * it can be written on; several may be marked at once; a scale is marked on
 * its line. The draft is held by the caller, so it survives turning away
 * from the page and back.
 */
export function SeekerPage({
  page,
  pondering,
  error,
  draft,
  setDraft,
  onAnswer,
  onRetry,
}: {
  page: Page;
  pondering: boolean;
  error?: string;
  draft: Draft;
  setDraft: (d: Draft) => void;
  onAnswer: (text: string) => void;
  onRetry: () => void;
}) {
  const { kind, options, scale } = page.question;
  const pick = (option: string) => {
    // An open question's options are opening words, to go on from.
    setDraft({ ...draft, text: kind === "open" ? option.replace(/[.…]+$/, "") : option });
    document.querySelector<HTMLTextAreaElement>("[data-quill]")?.focus();
  };
  const toggle = (option: string) =>
    setDraft({ ...draft, picks: draft.picks.includes(option) ? draft.picks.filter((o) => o !== option) : [...draft.picks, option] });
  const answer = answerOf(draft, page.question);
  const placeholder = {
    single: "在此写下你的回答……",
    multi: "可多选，也可在此补充……",
    scale: "也可在此补充……",
    open: "用你自己的话说说……",
  }[kind];

  return (
    <div className="flex h-full flex-col">
      <PageHeading latin="RESPONSIO">你的回答</PageHeading>
      {page.answer !== undefined ? (
        <div className="page-scroll min-h-0 flex flex-col gap-[1.6em] pb-[1em]">
          <p className="font-song text-[0.95em] leading-[1.9] tracking-[0.05em] whitespace-pre-wrap text-ink/75">{page.answer}</p>
          {error ? <ErrorNote message={error} onRetry={onRetry} /> : pondering && <Pondering label="预言书正在凝视你的话语" />}
        </div>
      ) : (
        <div className="page-scroll min-h-0 pb-[1em]">
          {kind === "scale" && scale && <Scale value={draft.scale} {...scale} onChange={(v) => setDraft({ ...draft, scale: v })} />}
          {kind === "multi" && (
            <motion.ul className="flex flex-wrap gap-x-[1.4em] gap-y-[0.5em]" {...optionList}>
              {options.map((o) => {
                const on = draft.picks.includes(o);
                return (
                  <motion.li key={o} variants={optionItem}>
                    <button
                      onClick={() => toggle(o)}
                      aria-pressed={on}
                      className={`group flex cursor-pointer items-center gap-[0.6em] py-[0.2em] text-left font-song text-[0.9em] tracking-[0.05em] ${on ? "text-ink" : "text-ink/70"}`}
                    >
                      <Diamond on={on} />
                      <span className="glow-text-group glow-text-soft">{o}</span>
                    </button>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
          {(kind === "single" || kind === "open") && options.length > 0 && (
            <motion.ul className="flex flex-col gap-[0.5em]" {...optionList}>
              {options.map((o) => (
                <motion.li key={o} variants={optionItem}>
                  <button
                    onClick={() => pick(o)}
                    className={`group flex cursor-pointer items-center gap-[0.7em] py-[0.2em] text-left font-song text-[0.9em] tracking-[0.05em] ${kind === "open" ? "text-ink/50" : "text-ink/75"}`}
                  >
                    <Diamond on={false} />
                    <span className="glow-text-group glow-text-soft">{o}</span>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          )}
          <Quill
            disabled={pondering}
            canSubmit={!!answer}
            onSubmit={() => onAnswer(answer)}
            text={draft.text}
            setText={(text) => setDraft({ ...draft, text })}
            placeholder={placeholder}
          />
        </div>
      )}
    </div>
  );
}

const PROLOGUE = "书页在你的指尖下苏醒。我将向你提出一连串问题，为你描绘一幅画像，再以它为凭推演命途。请如实作答——你的回答越具体，我看见的便越清晰。";

/**
 * Below the prologue: the book waking, then, once the first question is
 * written and the prologue has finished writing, a prompt to turn to it.
 */
function PrologueTurn({ ready, error, onTurn }: { ready: boolean; error?: string; onTurn: () => void }) {
  const settle = useContext(PageSettle);
  // Mounted with the page, so the prompt can wait out whatever of the prologue is still being written.
  const mountedAt = useRef(performance.now());
  if (!ready) return error ? null : <Pondering label="预言书正在苏醒" />;
  const written = settle + inkDuration(PROLOGUE) + 0.3;
  const delay = Math.max(0.2, written - (performance.now() - mountedAt.current) / 1000);
  return (
    <motion.button
      onClick={onTurn}
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1, delay }}
      className="group flex cursor-pointer items-center gap-[0.8em] self-start font-song text-[0.85em] tracking-[0.2em] text-jacaranda"
    >
      <span className="h-px w-[1.6em] bg-peach-gold" />
      <span className="glow-text-group">第一问已写在后页，翻过去作答 ›</span>
    </motion.button>
  );
}

/**
 * The prologue, the book's first spread: while the book wakes it writes its
 * first question overleaf, and then waits for the seeker to turn to it.
 */
export function prologueSpread({ ready, error, onTurn, onRetry }: { ready: boolean; error?: string; onTurn: () => void; onRetry: () => void }) {
  return {
    left: (
      <div className="flex h-full flex-col">
        <PageHeading latin="PROOEMIUM">序章</PageHeading>
        <p className="mb-[2em] font-song text-[1.05em] leading-[2] tracking-[0.05em] text-ink/80">
          <InkText text={PROLOGUE} />
        </p>
        <PrologueTurn ready={ready} error={error} onTurn={onTurn} />
      </div>
    ),
    right: <div className="flex h-full flex-col justify-center">{error && <ErrorNote message={error} onRetry={onRetry} />}</div>,
  };
}

const DRAWING = {
  portrait: { latin: "EFFIGIES", title: "描绘", words: "现在，让我为你描绘你的模样……", busy: "你的模样正在显形", done: "你的模样已经显形" },
  prophecy: { latin: "VATICINIUM", title: "推演", words: "以这幅画像为凭，让我为你推演命途……", busy: "命途正在显形", done: "命途已经显形" },
};

/**
 * The book's closing words beside its sigil: drawn and turning while the
 * portrait or the prophecy is worked out (`live`), and still once written.
 */
export function drawingSpread({ of, page, live, error, onRetry }: { of: keyof typeof DRAWING; page?: Page; live: boolean; error?: string; onRetry: () => void }) {
  const d = DRAWING[of];
  const reply = page?.question.reply ?? "";
  const words = page?.question.question ?? d.words;
  return {
    left: (
      <div className="flex h-full flex-col">
        <PageHeading latin={d.latin}>{d.title}</PageHeading>
        <div className="page-scroll min-h-0 pb-[1em]">
          {reply && (
            <p className="mb-[1.2em] font-song text-[0.88em] leading-[2] tracking-[0.05em] [--ink-dry:rgb(43_38_51/0.55)]">
              <InkText text={reply} />
            </p>
          )}
          <p className="font-song text-[1.2em] leading-[1.9] tracking-[0.05em]">
            <InkText text={words} after={reply ? inkDuration(reply) + 0.3 : 0} />
          </p>
        </div>
      </div>
    ),
    right: (
      <div className="flex h-full flex-col items-center justify-center gap-[2em]">
        <svg viewBox="-110 -110 220 220" className="w-[70%]" aria-hidden>
          <g className={live && !error ? "origin-user-zero animate-turn-slow" : ""}>
            <Sigil r={100} draw delay={0.6} />
          </g>
        </svg>
        {error ? (
          <ErrorNote message={error} onRetry={onRetry} />
        ) : live ? (
          <Pondering label={d.busy} />
        ) : (
          <p className="font-song text-[0.85em] tracking-[0.3em] text-jacaranda/80">{d.done}</p>
        )}
      </div>
    ),
  };
}
