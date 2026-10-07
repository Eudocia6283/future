import { motion } from "motion/react";
import { useState, type ReactNode } from "react";
import type { Portrait, Prophecy } from "../../shared/oracle";
import { InkText, inkDuration } from "../book/InkText";
import { ErrorNote, PageHeading, Pondering } from "../book/pages";
import { WordCloud } from "./WordCloud";

export type SpreadContent = { left: ReactNode; right: ReactNode };

/** A small diamond bullet. */
const Mark = ({ gold = false }: { gold?: boolean }) => (
  <span className={`mt-[0.6em] size-[0.4em] shrink-0 rotate-45 border ${gold ? "border-peach-gold bg-peach-gold" : "border-jacaranda-light"}`} />
);

function Scroll({ children }: { children: ReactNode }) {
  return <div className="page-scroll min-h-0 flex-1 pb-[1.5em]">{children}</div>;
}

/** A quiet button: a hairline, then its label, which glows on hover. */
function LineButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group flex cursor-pointer items-center gap-[0.8em] font-song text-[0.85em] tracking-[0.2em] text-jacaranda transition-opacity disabled:cursor-default disabled:opacity-30"
    >
      <span className="h-px w-[1.6em] bg-peach-gold" />
      <span className="glow-text-group">{children}</span>
    </button>
  );
}

/**
 * The seeker's corrections: what the book is unsure of, each one a prompt
 * to write the truth of it, and a line for anything else it got wrong.
 */
function Corrections({ uncertain, notes, onCorrect }: { uncertain: string[]; notes: string[]; onCorrect: (note: string) => void }) {
  const [text, setText] = useState("");
  const [about, setAbout] = useState<string>();
  const submit = () => {
    const t = text.trim();
    if (!t) return;
    onCorrect(about ? `关于「${about}」：${t}` : t);
  };
  return (
    <div className="flex flex-col gap-[1em]">
      {uncertain.length > 0 && (
        <ul className="flex flex-col gap-[0.45em]">
          {uncertain.map((u) => (
            <li key={u}>
              <button
                onClick={() => {
                  setAbout(about === u ? undefined : u);
                  document.querySelector<HTMLTextAreaElement>("[data-correction]")?.focus();
                }}
                className={`group flex cursor-pointer gap-[0.7em] text-left font-song text-[0.8em] leading-[1.8] ${about === u ? "text-jacaranda" : "text-ink/65"}`}
              >
                <Mark gold={about === u} />
                <span className="glow-text-group glow-text-soft">{u}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-end gap-[0.6em] border-b border-jacaranda-light/50 pb-[0.3em] transition-colors focus-within:border-jacaranda">
        <textarea
          data-correction
          rows={2}
          value={text}
          maxLength={600}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder={about ? `关于「${about}」，实际上……` : "哪里画得不像？写下来，我会重新描绘……"}
          aria-label="更正画像"
          className="max-h-[6em] flex-1 resize-none bg-transparent font-song text-[0.85em] leading-[1.8] text-ink outline-none placeholder:text-ink/30"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-[1em]">
        <LineButton onClick={submit} disabled={!text.trim()}>
          依此重绘画像
        </LineButton>
        {notes.length > 0 && <span className="font-song text-[0.62em] tracking-[0.15em] text-ink/40">已更正 {notes.length} 处</span>}
      </div>
    </div>
  );
}

/**
 * The portrait, over two spreads: the word cloud beside the written
 * portrait; then what the book is unsure of, for the seeker to correct,
 * beside the way on to the prophecy.
 */
export function portraitSpreads({
  portrait,
  notes,
  accepted,
  redrawing,
  error,
  onCorrect,
  onAccept,
  onRetry,
}: {
  portrait: Portrait;
  notes: string[];
  /** The seeker has gone on to the prophecy, so the portrait stands. */
  accepted: boolean;
  /** It is being drawn again with the latest correction taken in. */
  redrawing: boolean;
  /** Why redrawing it failed. */
  error?: string;
  onCorrect: (note: string) => void;
  onAccept: () => void;
  onRetry: () => void;
}): SpreadContent[] {
  const paragraphs = portrait.summary.split(/\n+/).filter(Boolean);
  // Each paragraph is written after the one before it.
  const after = paragraphs.map((_, i) => inkDuration(portrait.title) + 0.3 + paragraphs.slice(0, i).reduce((t, p) => t + inkDuration(p) + 0.2, 0));
  return [
    {
      left: (
        <div className="flex h-full flex-col">
          <PageHeading latin="EFFIGIES">你的画像</PageHeading>
          <div className="min-h-0 flex-1">
            <WordCloud keywords={portrait.keywords} />
          </div>
        </div>
      ),
      right: (
        <div className="flex h-full flex-col">
          <PageHeading latin="NOMEN">你的称号</PageHeading>
          <Scroll>
            <p className="mb-[0.9em] font-song text-[1.45em] tracking-[0.15em] text-ink">
              <InkText text={portrait.title} />
            </p>
            <div className="flex flex-col gap-[0.9em]">
              {paragraphs.map((p, i) => (
                <p key={i} className="font-song text-[0.82em] leading-[2] tracking-[0.03em] indent-[2em] [--ink-dry:rgb(43_38_51/0.78)]">
                  <InkText text={p} after={after[i]} />
                </p>
              ))}
            </div>
          </Scroll>
        </div>
      ),
    },
    {
      left: (
        <div className="flex h-full flex-col">
          <PageHeading latin="EMENDATIO">尚待确认</PageHeading>
          <Scroll>
            <p className="mb-[1.2em] font-song text-[0.85em] leading-[2] text-ink/70">
              <InkText
                text={
                  accepted
                    ? "你已认下这幅画像，此后的预言都以它为凭。"
                    : portrait.uncertain.length
                      ? "这幅画像里，有几处我还看不真切。点选其一写下实情，或指出任何画得不像的地方："
                      : "这幅画像若有画得不像之处，写下来，我会重新描绘："
                }
              />
            </p>
            {redrawing ? (
              error ? (
                <ErrorNote message={error} onRetry={onRetry} />
              ) : (
                <Pondering label="正依你的更正重新描绘" />
              )
            ) : (
              !accepted && <Corrections key={notes.length} uncertain={portrait.uncertain} notes={notes} onCorrect={onCorrect} />
            )}
            {(accepted || redrawing) && notes.length > 0 && (
              <ul className="mt-[1.2em] flex flex-col gap-[0.4em]">
                {notes.map((n) => (
                  <li key={n} className="flex gap-[0.7em] font-song text-[0.75em] leading-[1.8] text-ink/55">
                    <Mark />
                    {n}
                  </li>
                ))}
              </ul>
            )}
          </Scroll>
        </div>
      ),
      right: (
        <div className="flex h-full flex-col items-center justify-center gap-[1.6em] text-center">
          <span className="h-px w-[3em] bg-peach-gold" />
          <p className="max-w-[14em] font-song text-[1em] leading-[2.1] tracking-[0.1em] text-ink/80">
            <InkText text="画像既成，命途便可推演。职业、方向、学识与历练，都将由此展开。" />
          </p>
          <span className="h-px w-[3em] bg-peach-gold" />
          {!accepted && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5, duration: 1 }}>
              <LineButton onClick={onAccept} disabled={redrawing}>
                画像无误，推演命途 ›
              </LineButton>
            </motion.div>
          )}
        </div>
      ),
    },
  ];
}

/** The prophecy, over two spreads: paths and study; practice and parting words. */
export function prophecySpreads(p: Prophecy, onRestart: () => void): SpreadContent[] {
  return [
    {
      left: (
        <div className="flex h-full flex-col">
          <PageHeading latin="VIAE">命途之章</PageHeading>
          <Scroll>
            <ol className="flex flex-col gap-[1.5em]">
              {p.paths.map((path, i) => (
                <li key={path.name}>
                  <div className="flex items-baseline justify-between gap-[1em]">
                    <span className="font-song text-[1.05em] tracking-[0.12em] text-ink">
                      <span className="mr-[0.6em] font-serif text-[0.7em] text-peach-gold">{["I", "II", "III"][i]}</span>
                      {path.name}
                    </span>
                    <span className="font-serif text-[0.8em] text-jacaranda">{path.match}</span>
                  </div>
                  <div className="relative my-[0.6em] h-px bg-jacaranda-light/25">
                    <span className="absolute inset-y-0 left-0 bg-peach-gold" style={{ width: `${path.match}%` }} />
                  </div>
                  <p className="font-song text-[0.78em] leading-[1.9] text-ink/60">{path.reason}</p>
                </li>
              ))}
            </ol>
          </Scroll>
        </div>
      ),
      right: (
        <div className="flex h-full flex-col">
          <PageHeading latin="STUDIA">学习之章</PageHeading>
          <Scroll>
            <div className="flex flex-col gap-[1.4em]">
              {p.learning.map((stage) => (
                <section key={stage.stage}>
                  <h3 className="font-song text-[0.72em] tracking-[0.3em] text-jacaranda">{stage.stage}</h3>
                  <p className="mt-[0.3em] mb-[0.5em] font-song text-[0.92em] leading-[1.8] text-ink">{stage.focus}</p>
                  <ul className="flex flex-col gap-[0.25em]">
                    {stage.items.map((item) => (
                      <li key={item} className="flex gap-[0.7em] font-song text-[0.78em] leading-[1.8] text-ink/65">
                        <Mark />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          </Scroll>
        </div>
      ),
    },
    {
      left: (
        <div className="flex h-full flex-col">
          <PageHeading latin="OPERA">实践之章</PageHeading>
          <Scroll>
            <ul className="flex flex-col gap-[1.4em]">
              {p.practice.map((x) => (
                <li key={x.name} className="flex gap-[0.8em]">
                  <Mark gold />
                  <div>
                    <p className="flex flex-wrap items-center gap-[0.7em] font-song text-[0.98em] tracking-[0.08em] text-ink">
                      {x.name}
                      <span className="border border-jacaranda-light/60 px-[0.5em] text-[0.65em] tracking-[0.2em] text-jacaranda">{x.kind}</span>
                    </p>
                    <p className="mt-[0.35em] font-song text-[0.78em] leading-[1.9] text-ink/60">{x.why}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Scroll>
        </div>
      ),
      right: (
        <div className="flex h-full flex-col">
          <PageHeading latin="VERBUM">临别箴言</PageHeading>
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <span className="mb-[1.6em] h-px w-[3em] bg-peach-gold" />
            <p className="font-song text-[1.1em] leading-[2.1] tracking-[0.1em] text-ink/85">
              <InkText text={p.counsel} />
            </p>
            <span className="mt-[1.6em] h-px w-[3em] bg-peach-gold" />
          </div>
          <button onClick={onRestart} className="group flex cursor-pointer items-center justify-center gap-[0.8em] self-center font-song text-[0.8em] tracking-[0.3em] text-ink/70">
            <span className="h-px w-[1.8em] bg-jacaranda-light" />
            <span className="glow-text-group">合上书，重新占卜</span>
            <span className="h-px w-[1.8em] bg-jacaranda-light" />
          </button>
        </div>
      ),
    },
  ];
}
